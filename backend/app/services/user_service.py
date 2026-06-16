"""User persistence helpers."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
