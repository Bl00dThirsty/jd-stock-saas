"""Authentication routes — Google OAuth login + JWT issue/refresh."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.oauth import oauth
from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.schemas.auth import RefreshRequest, TokenPair
from app.schemas.user import UserOut
from app.services.user_service import get_or_create_from_google

router = APIRouter()
users_router = APIRouter()


@router.post("/dev-login", response_model=TokenPair)
async def dev_login(db: DbSession) -> TokenPair:
    """Issue tokens for a demo user WITHOUT Google — development only.

    Lets the app be launched and explored locally without configuring
    Google OAuth. Disabled outside ``ENVIRONMENT=development``.
    """
    if settings.ENVIRONMENT != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is disabled outside development.",
        )

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
    await db.commit()
    return TokenPair(
        access_token=create_access_token(str(demo.id)),
        refresh_token=create_refresh_token(str(demo.id)),
    )


@router.get("/google/login")
async def google_login(request: Request):
    """Kick off the Google OAuth flow."""
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: DbSession):
    """OAuth callback: exchange code, upsert user, redirect to frontend with tokens."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth exchange failed: {exc}",
        ) from exc

    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    user = await get_or_create_from_google(db, dict(userinfo))
    await db.commit()

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))

    # Hand tokens to the SPA via URL fragment (not sent to servers / logs).
    redirect_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"#access_token={access}&refresh_token={refresh}"
    )
    return RedirectResponse(url=redirect_url)


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(body: RefreshRequest, db: DbSession) -> TokenPair:
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

    return TokenPair(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@users_router.get("/me", response_model=UserOut)
async def read_me(current_user: CurrentUser) -> User:
    return current_user
