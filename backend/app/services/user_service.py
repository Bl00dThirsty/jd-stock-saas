"""User persistence helpers."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


async def get_or_create_from_google(db: AsyncSession, userinfo: dict) -> User:
    """Upsert a user from a Google ``userinfo`` payload."""
    google_id = userinfo["sub"]
    user = await db.scalar(select(User).where(User.google_id == google_id))

    if user is None:
        # Fall back to email match (e.g. account created another way).
        user = await db.scalar(select(User).where(User.email == userinfo["email"]))

    if user is None:
        user = User(
            email=userinfo["email"],
            google_id=google_id,
            display_name=userinfo.get("name"),
            picture=userinfo.get("picture"),
            email_verified=userinfo.get("email_verified", False),
        )
        db.add(user)
    else:
        # Keep profile fresh on each login.
        user.google_id = google_id
        user.display_name = userinfo.get("name", user.display_name)
        user.picture = userinfo.get("picture", user.picture)
        user.email_verified = userinfo.get("email_verified", user.email_verified)

    await db.flush()
    await db.refresh(user)
    return user


async def get_or_create_from_apple(
    db: AsyncSession, email: str, display_name: str | None = None
) -> User:
    """Upsert a user from a Sign-in-with-Apple identity.

    Apple users are keyed by their (verified) email — we don't store an
    Apple-specific id, so this links to an existing account with the same email.
    """
    user = await db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        user = User(
            email=email.lower(),
            display_name=display_name,
            email_verified=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    return user


async def email_exists(db: AsyncSession, email: str) -> bool:
    return (await db.scalar(select(User).where(User.email == email.lower()))) is not None


async def create_with_password(
    db: AsyncSession, email: str, password: str, display_name: str | None = None
) -> User:
    """Create a new user authenticated by email + password."""
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        display_name=display_name,
        email_verified=False,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    """Return the user if the email/password pair is valid, else None.

    Always runs a hash comparison (even when the user is missing or has no
    local password) to avoid leaking account existence via timing.
    """
    user = await db.scalar(select(User).where(User.email == email.lower()))
    stored = user.password_hash if user and user.password_hash else None
    # Dummy hash keeps the timing roughly constant for unknown accounts.
    reference = stored or "$2b$12$" + "." * 53
    ok = verify_password(password, reference)
    if user is None or stored is None or not ok or not user.is_active:
        return None
    return user
