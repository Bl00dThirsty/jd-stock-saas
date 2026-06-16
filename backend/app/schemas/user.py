"""User schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    # Plain str: the address is already verified upstream (Google userinfo).
    # Swap to EmailStr if you add the `email-validator` dependency.
    email: str
    display_name: str | None = None
    picture: str | None = None
    email_verified: bool
    created_at: datetime
