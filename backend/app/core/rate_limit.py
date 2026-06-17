"""Rate limiting (slowapi) + Brute-force protection via Redis."""

from datetime import timedelta

from fastapi import HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.redis import redis_client

# Shared slowapi limiter — use @limiter.limit("…") on routes.
limiter = Limiter(key_func=get_remote_address, storage_uri=None)

# ─── Brute-force helpers ────────────────────────────────────────────────

_BRUTE_PREFIX = "brute:"
_MAX_ATTEMPTS = 5
_LOCKOUT_MINUTES = 15


async def _brute_key(identifier: str) -> str:
    return f"{_BRUTE_PREFIX}{identifier}"


async def record_failed_attempt(identifier: str) -> int:
    """Increment the failed-attempt counter. Returns the current count."""
    key = await _brute_key(identifier)
    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, timedelta(minutes=_LOCKOUT_MINUTES))
    return count


async def is_locked_out(identifier: str) -> bool:
    """Return True if the identifier is temporarily blocked."""
    key = await _brute_key(identifier)
    count = await redis_client.get(key)
    return count is not None and int(count) >= _MAX_ATTEMPTS


async def clear_failed_attempts(identifier: str) -> None:
    """Remove the lockout key after a successful login."""
    key = await _brute_key(identifier)
    await redis_client.delete(key)


async def check_brute_force(identifier: str) -> None:
    """Raise 429 if the identifier is locked out."""
    if await is_locked_out(identifier):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later.",
        )


def brute_force_identifier(request: Request) -> str:
    """Identify a user for brute-force tracking: IP + email if available."""
    email = ""
    try:
        body = request.json()
        email = body.get("email", "") if isinstance(body, dict) else ""
    except Exception:
        pass
    client_ip = get_remote_address(request)
    return f"{client_ip}:{email}"
