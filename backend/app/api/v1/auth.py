"""Authentication routes — Google OAuth login + JWT issue/refresh."""

import base64
import io
from datetime import UTC, datetime
from uuid import UUID

import pyotp
import qrcode
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.core.audit import log_action
from app.core.config import settings
from app.core.deps import ClientIP, CurrentUser, DbSession, TokenPayload, UserAgent
from app.core.oauth import oauth
from app.core.rate_limit import (
    check_brute_force,
    clear_failed_attempts,
    limiter,
    record_failed_attempt,
)
from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token_rotated,
    decode_token,
    verify_and_rotate_refresh,
)
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import (
    ConsentStatus,
    DeleteAccountRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    SessionOut,
    TokenPair,
    TwoFactorEnableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
)
from app.schemas.user import UserOut, UserUpdate
from app.services.user_service import (
    authenticate,
    create_with_password,
    email_exists,
    get_or_create_from_apple,
    get_or_create_from_google,
)

router = APIRouter()
users_router = APIRouter()


# ─── Helpers ────────────────────────────────────────────────────────────


async def _create_session(
    db: DbSession,
    user_id: UUID,
    ip_address: str | None,
    user_agent: str | None,
) -> UserSession:
    session = UserSession(
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True,
        last_activity_at=datetime.now(UTC),
    )
    db.add(session)
    await db.flush()
    return session


async def _issue_tokens(
    db: DbSession,
    user_id: str,
    client_ip: str,
    user_agent: str,
    auth_method: str,
) -> TokenPair:
    session = await _create_session(db, UUID(user_id), client_ip, user_agent)
    access = create_access_token(user_id, session_id=str(session.id))
    refresh, family_id = await create_refresh_token_rotated(user_id)
    await log_action(
        db, UUID(user_id), "login", "user", user_id, client_ip, user_agent, auth_method
    )
    return TokenPair(access_token=access, refresh_token=refresh)


# ─── TOTP / 2FA ─────────────────────────────────────────────────────────


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(current_user: CurrentUser):
    """Generate a TOTP secret and provisioning URI for the user."""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=current_user.email or current_user.id.hex,
        issuer_name=settings.PROJECT_NAME,
    )
    qr = qrcode.make(uri)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    current_user.totp_secret = secret
    return TwoFactorSetupResponse(secret=secret, provisioning_uri=uri, qr_b64=qr_b64)


@router.post("/2fa/verify")
async def verify_2fa(body: TwoFactorVerifyRequest, db: DbSession, current_user: CurrentUser):
    """Verify a TOTP code against the stored secret."""
    if not current_user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not initialized")
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code")
    return {"valid": True}


@router.post("/2fa/enable")
async def enable_2fa(body: TwoFactorEnableRequest, db: DbSession, current_user: CurrentUser):
    """Enable TOTP after verifying the code."""
    if not current_user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not initialized")
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code")
    current_user.totp_enabled = True
    return {"detail": "2FA enabled"}


@router.post("/2fa/disable")
async def disable_2fa(db: DbSession, current_user: CurrentUser):
    """Disable TOTP."""
    current_user.totp_secret = None
    current_user.totp_enabled = False
    return {"detail": "2FA disabled"}


# ─── Authentication ─────────────────────────────────────────────────────


@router.post("/dev-login")
@limiter.limit("5/minute")
async def dev_login(
    request: Request,
    db: DbSession,
    client_ip: ClientIP,
    user_agent: UserAgent,
) -> TokenPair:
    """Issue tokens for a demo user WITHOUT Google — development only."""
    if settings.ENVIRONMENT != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is disabled outside development.",
        )

    bf_id = f"{client_ip}:dev-login"
    await check_brute_force(bf_id)

    demo = await get_or_create_from_google(
        db,
        {
            "sub": "dev-demo-user",
            "email": "demo@ngx.local",
            "name": "Demo Investor",
            "picture": None,
            "email_verified": True,
        },
    )
    await db.flush()

    await clear_failed_attempts(bf_id)
    return await _issue_tokens(db, str(demo.id), client_ip, user_agent, "dev-login")


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    db: DbSession,
    client_ip: ClientIP,
    user_agent: UserAgent,
) -> TokenPair:
    """Create an account with email + password and return a token pair."""
    if await email_exists(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = await create_with_password(db, body.email, body.password, body.display_name)
    await db.flush()

    return await _issue_tokens(db, str(user.id), client_ip, user_agent, "email-password")


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: DbSession,
    client_ip: ClientIP,
    user_agent: UserAgent,
) -> TokenPair:
    """Authenticate with email + password and return a token pair."""
    bf_id = f"{client_ip}:{body.email}"
    await check_brute_force(bf_id)

    user = await authenticate(db, body.email, body.password)
    if user is None:
        await record_failed_attempt(bf_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA code required. Use /auth/2fa/verify.",
        )

    await clear_failed_attempts(bf_id)
    return await _issue_tokens(db, str(user.id), client_ip, user_agent, "email-password")


@router.get("/google/login")
async def google_login(request: Request):
    """Kick off the Google OAuth flow."""
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: DbSession,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """OAuth callback: exchange code, upsert user, redirect to frontend with tokens."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth exchange failed: {exc}",
        ) from exc

    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    user = await get_or_create_from_google(db, dict(userinfo))
    await db.flush()

    bf_id = f"{client_ip}:{user.email}"
    await check_brute_force(bf_id)

    if user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA code required. Use /auth/2fa/verify.",
        )

    await clear_failed_attempts(bf_id)

    tokens = await _issue_tokens(db, str(user.id), client_ip, user_agent, "google-oauth")

    redirect_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"#access_token={tokens.access_token}&refresh_token={tokens.refresh_token}"
    )
    return RedirectResponse(url=redirect_url)


@router.get("/apple/login")
async def apple_login(request: Request):
    """Kick off the Sign-in-with-Apple flow (requires Apple credentials)."""
    if not settings.apple_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Apple sign-in is not configured.",
        )
    return await oauth.apple.authorize_redirect(request, settings.APPLE_REDIRECT_URI)


@router.api_route("/apple/callback", methods=["GET", "POST"])
async def apple_callback(
    request: Request,
    db: DbSession,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Apple OAuth callback (Apple POSTs via form_post)."""
    if not settings.apple_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Apple sign-in is not configured.",
        )
    try:
        token = await oauth.apple.authorize_access_token(request)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Apple OAuth exchange failed: {exc}",
        ) from exc

    claims = token.get("userinfo") or {}
    email = claims.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apple did not return an email address.",
        )

    user = await get_or_create_from_apple(db, email)
    await db.flush()

    if user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA code required. Use /auth/2fa/verify.",
        )

    tokens = await _issue_tokens(db, str(user.id), client_ip, user_agent, "apple-oauth")

    redirect_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"#access_token={tokens.access_token}&refresh_token={tokens.refresh_token}"
    )
    return RedirectResponse(url=redirect_url)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    body: RefreshRequest,
    db: DbSession,
    client_ip: ClientIP,
    user_agent: UserAgent,
) -> TokenPair:
    """Refresh an access token. Old refresh token is invalidated (rotation)."""
    payload = decode_token(body.refresh_token, expected_type=REFRESH)
    if payload is None or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    user = await db.scalar(select(User).where(User.id == UUID(payload["sub"])))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_refresh = await verify_and_rotate_refresh(payload)
    if new_refresh is None:
        await record_failed_attempt(f"{client_ip}:{user.email}")
        await log_action(
            db, user.id, "token_reuse_detected", "auth", str(user.id), client_ip, user_agent
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked. Please log in again.",
        )

    session_id = None
    if "family" in payload:
        stmt = (
            select(UserSession)
            .where(
                UserSession.user_id == user.id,
                UserSession.is_active.is_(True),
            )
            .order_by(UserSession.last_activity_at.desc())
            .limit(1)
        )
        last_session = await db.scalar(stmt)
        if last_session:
            session_id = str(last_session.id)
            last_session.last_activity_at = datetime.now(UTC)

    access = create_access_token(str(user.id), session_id=session_id)
    await log_action(db, user.id, "token_refresh", "auth", str(user.id), client_ip, user_agent)

    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout")
async def logout(
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
    token_payload: TokenPayload,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Logout — mark current session inactive and log the event."""
    sid = token_payload.get("sid")
    if sid:
        session = await db.scalar(
            select(UserSession).where(
                UserSession.id == UUID(sid),
                UserSession.user_id == current_user.id,
            )
        )
        if session:
            session.is_active = False

    await log_action(
        db, current_user.id, "logout", "user", str(current_user.id), client_ip, user_agent
    )
    return {"detail": "Logged out"}


# ─── User profile ───────────────────────────────────────────────────────


@users_router.get("/me", response_model=UserOut)
async def read_me(current_user: CurrentUser) -> User:
    return current_user


@users_router.patch("/me", response_model=UserOut)
async def update_me(
    body: UserUpdate,
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
) -> User:
    if body.display_name is not None:
        current_user.display_name = body.display_name
    await log_action(
        db, current_user.id, "profile_update", "user", str(current_user.id), client_ip, user_agent
    )
    return current_user


# ─── RGPD / Data Protection ─────────────────────────────────────────────


@users_router.get("/me/export")
async def export_user_data(
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Export all user data as JSON (RGPD right of access)."""
    from app.models.alert import PriceAlert
    from app.models.portfolio import Portfolio

    portfolios = await db.execute(select(Portfolio).where(Portfolio.user_id == current_user.id))
    alerts = await db.execute(select(PriceAlert).where(PriceAlert.user_id == current_user.id))
    sessions = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .order_by(UserSession.created_at.desc())
    )

    await log_action(
        db, current_user.id, "data_export", "user", str(current_user.id), client_ip, user_agent
    )
    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "user": UserOut.model_validate(current_user).model_dump(),
        "portfolios": [{"id": str(p.id), "name": p.name} for p in portfolios.scalars().all()],
        "alerts": [
            {"id": str(a.id), "symbol": a.symbol, "target_price": a.target_price}
            for a in alerts.scalars().all()
        ],
        "sessions": [
            {
                "id": str(s.id),
                "created_at": s.created_at.isoformat(),
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "is_active": s.is_active,
            }
            for s in sessions.scalars().all()
        ],
    }


@users_router.get("/me/export/pdf")
async def export_user_data_pdf(
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Export all user data as PDF (RGPD right of access)."""
    from app.models.alert import PriceAlert
    from app.models.portfolio import Portfolio

    portfolios = await db.execute(select(Portfolio).where(Portfolio.user_id == current_user.id))
    alerts = await db.execute(select(PriceAlert).where(PriceAlert.user_id == current_user.id))
    sessions = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .order_by(UserSession.created_at.desc())
    )

    await log_action(
        db, current_user.id, "data_export_pdf", "user", str(current_user.id), client_ip, user_agent
    )

    user = current_user
    portfolios_list = list(portfolios.scalars().all())
    alerts_list = list(alerts.scalars().all())
    sessions_list = list(sessions.scalars().all())

    html = _build_export_html(user, portfolios_list, alerts_list, sessions_list)

    try:
        from weasyprint import HTML as HTMLRenderer

        pdf_bytes = HTMLRenderer(string=html).write_pdf()
    except ImportError:
        from fpdf import FPDF

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=12)
        pdf.cell(200, 10, text="Vortex - Data Export", align="C")
        pdf.ln(20)
        pdf.set_font("Helvetica", size=10)
        pdf.cell(200, 10, text=f"User: {user.email}", align="L")
        pdf.ln(10)
        pdf.cell(200, 10, text=f"Name: {user.display_name or 'N/A'}", align="L")
        pdf.ln(10)
        pdf.cell(200, 10, text=f"Role: {user.role.value}", align="L")
        pdf.ln(10)
        pdf.cell(
            200,
            10,
            text=f"Joined: {user.created_at.strftime('%Y-%m-%d') if user.created_at else 'N/A'}",
            align="L",
        )
        pdf.ln(20)

        if portfolios_list:
            pdf.set_font("Helvetica", style="B", size=11)
            pdf.cell(200, 10, text="Portfolios:", align="L")
            pdf.ln(10)
            pdf.set_font("Helvetica", size=10)
            for p in portfolios_list:
                pdf.cell(200, 10, text=f"  - {p.name}", align="L")
                pdf.ln(8)

        if alerts_list:
            pdf.ln(10)
            pdf.set_font("Helvetica", style="B", size=11)
            pdf.cell(200, 10, text="Alerts:", align="L")
            pdf.ln(10)
            pdf.set_font("Helvetica", size=10)
            for a in alerts_list:
                state = "active" if a.is_active else "inactive"
                pdf.cell(
                    200,
                    10,
                    text=f"  - {a.symbol} @ {a.target_price} ({state})",
                    align="L",
                )
                pdf.ln(8)

        pdf_bytes = bytes(pdf.output())

    from fastapi.responses import Response

    filename = f"vortex-data-export-{user.id.hex[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


def _build_export_html(
    user: User,
    portfolios: list,
    alerts: list,
    sessions: list | None = None,
) -> str:
    rows = []
    for p in portfolios:
        rows.append(f"<tr><td>{p.id.hex[:8]}</td><td>{p.name}</td></tr>")

    alert_rows = []
    for a in alerts:
        status = "Active" if a.is_active else "Inactive"
        alert_rows.append(
            f"<tr><td>{a.symbol}</td><td>{a.target_price}</td><td>{a.direction}</td><td>{status}</td></tr>"
        )

    session_rows = []
    if sessions:
        for s in sessions:
            active = "Active" if s.is_active else "Inactive"
            session_rows.append(
                f"<tr><td>{s.created_at.strftime('%Y-%m-%d %H:%M') if s.created_at else '—'}</td>"
                f"<td>{s.ip_address or '—'}</td><td>{active}</td></tr>"
            )

    joined = user.created_at.strftime("%Y-%m-%d") if user.created_at else "—"
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Vortex – Data Export</title>
<style>
  body {{ font-family: 'Helvetica', 'Arial', sans-serif; color: #222; margin: 2rem; }}
  h1 {{ color: #6b3fa0; border-bottom: 2px solid #6b3fa0; padding-bottom: 0.5rem; }}
  h2 {{ color: #444; margin-top: 2rem; }}
  table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; }}
  th, td {{ text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }}
  th {{ background: #f5f5f5; }}
  .meta {{ color: #666; font-size: 0.9rem; }}
</style></head>
<body>
<h1>Vortex – Data Export</h1>
<p class="meta">Exported {datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")}</p>

<h2>Profile</h2>
<table>
  <tr><th>Email</th><td>{user.email}</td></tr>
  <tr><th>Name</th><td>{user.display_name or "—"}</td></tr>
  <tr><th>Role</th><td>{user.role.value}</td></tr>
  <tr><th>Joined</th><td>{joined}</td></tr>
  <tr><th>2FA</th><td>{"Enabled" if user.totp_enabled else "Disabled"}</td></tr>
  <tr><th>Consent</th><td>{"Given" if user.consent_given_at else "Not given"}</td></tr>
</table>

<h2>Portfolios ({len(portfolios)})</h2>
<table>
  <tr><th>ID</th><th>Name</th></tr>
  {"".join(rows) if rows else '<tr><td colspan="2">No portfolios</td></tr>'}
</table>

<h2>Alerts ({len(alerts)})</h2>
<table>
  <tr><th>Symbol</th><th>Target</th><th>Direction</th><th>Status</th></tr>
  {"".join(alert_rows) if alert_rows else '<tr><td colspan="4">No alerts</td></tr>'}
</table>

<h2>Sessions ({len(sessions) if sessions else 0})</h2>
<table>
  <tr><th>Date</th><th>IP Address</th><th>Status</th></tr>
  {"".join(session_rows) if session_rows else '<tr><td colspan="3">No session data</td></tr>'}
</table>

<p class="meta">This export contains all personal data held by Vortex.</p>
</body></html>"""


@users_router.delete("/me")
async def delete_account(
    body: DeleteAccountRequest,
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Delete user account and all associated data (right to erasure).
    Requires a confirmation string matching the user's email.
    """
    if body.confirmation.strip().lower() != current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation must match your email address.",
        )

    await log_action(
        db, current_user.id, "account_deletion", "user", str(current_user.id), client_ip, user_agent
    )

    stmt = select(UserSession).where(UserSession.user_id == current_user.id)
    sessions = await db.execute(stmt)
    for s in sessions.scalars().all():
        s.is_active = False

    await db.delete(current_user)
    return {"detail": "Account deleted. All personal data has been erased."}


@users_router.post("/me/consent")
async def give_consent(
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Record explicit user consent for data processing."""
    current_user.consent_given_at = datetime.now(UTC)
    await log_action(
        db, current_user.id, "consent_given", "user", str(current_user.id), client_ip, user_agent
    )
    return {"detail": "Consent recorded. Thank you."}


@users_router.get("/me/consent", response_model=ConsentStatus)
async def consent_status(
    current_user: CurrentUser,
):
    """Check whether the user has given data-processing consent."""
    return ConsentStatus(
        consent_given=current_user.consent_given_at is not None,
        consent_given_at=current_user.consent_given_at.isoformat()
        if current_user.consent_given_at
        else None,
    )


# ─── Session management ─────────────────────────────────────────────────


@users_router.get("/me/sessions", response_model=list[SessionOut])
async def list_sessions(
    db: DbSession,
    current_user: CurrentUser,
):
    """List all sessions for the current user, most recent first."""
    stmt = (
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .order_by(UserSession.last_activity_at.desc())
        .limit(50)
    )
    sessions = await db.execute(stmt)
    return [
        SessionOut(
            id=str(s.id),
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            last_activity_at=s.last_activity_at.isoformat() if s.last_activity_at else None,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            is_active=s.is_active,
        )
        for s in sessions.scalars().all()
    ]


@users_router.delete("/me/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Revoke a specific session — mark it inactive and log the action."""
    session = await db.scalar(
        select(UserSession).where(
            UserSession.id == UUID(session_id),
            UserSession.user_id == current_user.id,
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.is_active = False
    await log_action(
        db, current_user.id, "session_revoked", "user_session", session_id, client_ip, user_agent
    )
    return {"detail": "Session revoked"}
