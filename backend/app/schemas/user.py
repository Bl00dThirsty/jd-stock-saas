"""User schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    # Plain str: the address is already verified upstream (Google userinfo).
    # Swap to EmailStr if you add the `email-validator` dependency.
    email: str
    display_name: str | None = None
    picture: str | None = None
    email_verified: bool
    role: UserRole
    totp_enabled: bool
    consent_given_at: datetime | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = None


class UserDataExport(BaseModel):
    user: UserOut
    portfolios: list | None = None
    alerts: list | None = None
