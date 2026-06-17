"""Authentication routes — Google OAuth login + JWT issue/refresh."""

import base64
import io
from uuid import UUID

import pyotp
import qrcode
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import ClientIP, CurrentUser, DbSession, UserAgent
from app.core.oauth import oauth
from app.core.rate_limit import (
    check_brute_force,
    clear_failed_attempts,
    limiter,
    record_failed_attempt,
)
from app.core.audit import log_action
from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    create_refresh_token_rotated,
    decode_token,
    verify_and_rotate_refresh,
)
from app.models.user import User, UserRole
from app.schemas.auth import (
    RefreshRequest,
    TokenPair,
    TwoFactorEnableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
)
from app.schemas.user import UserDataExport, UserOut, UserUpdate
from app.services.user_service import get_or_create_from_google

router = APIRouter()
users_router = APIRouter()


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

    # Store secret temporarily (only enable after verification)
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

    access = create_access_token(str(demo.id))
    refresh, family_id = await create_refresh_token_rotated(str(demo.id))

    await clear_failed_attempts(bf_id)
    await log_action(db, demo.id, "login", "user", str(demo.id), client_ip, user_agent, "dev-login")

    return TokenPair(access_token=access, refresh_token=refresh)


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

    # Check brute force
    bf_id = f"{client_ip}:{user.email}"
    await check_brute_force(bf_id)

    # 2FA check — if enabled, require second factor
    if user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA code required. Use /auth/2fa/verify.",
        )

    access = create_access_token(str(user.id))
    refresh, family_id = await create_refresh_token_rotated(str(user.id))

    await clear_failed_attempts(bf_id)
    await log_action(db, user.id, "login", "user", str(user.id), client_ip, user_agent, "google-oauth")

    redirect_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"#access_token={access}&refresh_token={refresh}"
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    new_refresh = await verify_and_rotate_refresh(payload)
    if new_refresh is None:
        # Token reuse detected or blacklisted
        await record_failed_attempt(f"{client_ip}:{user.email}")
        await log_action(db, user.id, "token_reuse_detected", "auth", str(user.id), client_ip, user_agent)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked. Please log in again.",
        )

    access = create_access_token(str(user.id))
    await log_action(db, user.id, "token_refresh", "auth", str(user.id), client_ip, user_agent)

    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout")
async def logout(
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Logout — client should discard tokens. Logs the event."""
    await log_action(db, current_user.id, "logout", "user", str(current_user.id), client_ip, user_agent)
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
    await log_action(db, current_user.id, "profile_update", "user", str(current_user.id), client_ip, user_agent)
    return current_user


# ─── RGPD / Data Protection ─────────────────────────────────────────────


@users_router.get("/me/export")
async def export_user_data(
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Export all user data (RGPD compliance)."""
    from app.models.alert import PriceAlert
    from app.models.portfolio import Portfolio

    portfolios = await db.execute(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    )
    alerts = await db.execute(
        select(PriceAlert).where(PriceAlert.user_id == current_user.id)
    )
    await log_action(db, current_user.id, "data_export", "user", str(current_user.id), client_ip, user_agent)
    return {
        "user": UserOut.model_validate(current_user).model_dump(),
        "portfolios": [{"id": str(p.id), "name": p.name} for p in portfolios.scalars().all()],
        "alerts": [
            {"id": str(a.id), "symbol": a.symbol, "target_price": a.target_price}
            for a in alerts.scalars().all()
        ],
    }


@users_router.delete("/me")
async def delete_account(
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Delete user account and all associated data (right to erasure)."""
    await log_action(db, current_user.id, "account_deletion", "user", str(current_user.id), client_ip, user_agent)
    await db.delete(current_user)
    return {"detail": "Account deleted"}


@users_router.post("/me/consent")
async def give_consent(
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Record explicit user consent for data processing."""
    from datetime import datetime, timezone

    current_user.consent_given_at = datetime.now(timezone.utc)
    await log_action(db, current_user.id, "consent_given", "user", str(current_user.id), client_ip, user_agent)
    return {"detail": "Consent recorded"}


# ─── Session management ─────────────────────────────────────────────────


@users_router.get("/me/sessions")
async def list_sessions(
    db: DbSession,
    current_user: CurrentUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """List active sessions for the current user (from audit logs)."""
    from app.core.audit import get_audit_logs

    logs = await get_audit_logs(db, user_id=current_user.id, action="login", limit=20)
    return [
        {
            "id": str(log.id),
            "created_at": log.created_at.isoformat(),
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
        }
        for log in logs
    ]
