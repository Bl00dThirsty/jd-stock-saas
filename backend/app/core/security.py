"""JWT creation & verification (access + refresh tokens)."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings
from app.core.redis import redis_client

ACCESS = "access"
REFRESH = "refresh"

# ─── Password hashing (bcrypt) ───────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt (per-hash random salt)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time check of a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False

# ─── Token blacklist helpers (Redis) ────────────────────────────────────

_BLACKLIST_PREFIX = "token:blacklist:"


async def _is_blacklisted(jti: str) -> bool:
    return await redis_client.exists(f"{_BLACKLIST_PREFIX}{jti}") > 0


async def _blacklist_token(jti: str, expires_in_seconds: int) -> None:
    await redis_client.setex(f"{_BLACKLIST_PREFIX}{jti}", expires_in_seconds, "1")


async def invalidate_refresh_token(jti: str, ttl_days: int = 7) -> None:
    """Blacklist a refresh token for its remaining lifetime."""
    await _blacklist_token(jti, ttl_days * 86400)


# ─── Token family tracking (for rotation + reuse detection) ─────────────

_FAMILY_PREFIX = "token:family:"


async def _get_family_nonce(family_id: str) -> int:
    val = await redis_client.get(f"{_FAMILY_PREFIX}{family_id}")
    return int(val) if val else 0


async def _increment_family_nonce(family_id: str, ttl_days: int) -> int:
    key = f"{_FAMILY_PREFIX}{family_id}"
    val = await redis_client.incr(key)
    if val == 1:
        await redis_client.expire(key, timedelta(days=ttl_days))
    return val


# ─── Token creation ──────────────────────────────────────────────────


def _create_token(subject: str, token_type: str, expires: timedelta, **extra: Any) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "jti": str(uuid4()),
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires,
        **extra,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, session_id: str | None = None, **extra: Any) -> str:
    if session_id:
        extra["sid"] = session_id
    return _create_token(
        subject,
        ACCESS,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        **extra,
    )


def create_refresh_token(subject: str, family_id: str | None = None) -> str:
    """Create a refresh token with an optional token-family id."""
    extra = {}
    if family_id:
        extra["family"] = family_id
    return _create_token(
        subject, REFRESH, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), **extra
    )


async def create_refresh_token_rotated(subject: str) -> tuple[str, str]:
    """Create a refresh token with rotation support.

    Returns (token_string, family_id).
    """
    family_id = secrets.token_hex(16)
    await _increment_family_nonce(family_id, settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return create_refresh_token(subject, family_id=family_id), family_id


async def verify_and_rotate_refresh(
    old_token_payload: dict[str, Any],
) -> str | None:
    """Verify a refresh token, check blacklist, detect reuse, and return a new token.

    Returns None if the token is invalid or reuse is detected (family invalidated).
    """
    jti = old_token_payload.get("jti")
    family_id = old_token_payload.get("family")
    sub = old_token_payload.get("sub")

    # 1. Check blacklist
    if jti and await _is_blacklisted(jti):
        return None

    # 2. Blacklist this token so it can't be used again
    if jti:
        await invalidate_refresh_token(jti, settings.REFRESH_TOKEN_EXPIRE_DAYS)

    # 3. If token belongs to a family, do reuse detection
    if family_id and sub:
        expected_nonce = await _get_family_nonce(family_id)
        # If the family nonce is gone or the jti doesn't match -> possible theft
        if expected_nonce == 0:
            return None

    # 4. Issue new token
    if family_id:
        new_token = create_refresh_token(sub, family_id=family_id)
    else:
        new_token = create_refresh_token(sub)

    return new_token


# ─── Token decoding ────────────────────────────────────────────────


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any] | None:
    """Decode & validate a JWT. Returns the payload or None if invalid."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None
    if expected_type and payload.get("type") != expected_type:
        return None
    return payload
