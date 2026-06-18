"""Auth-related schemas."""

from pydantic import BaseModel, EmailStr, Field


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TwoFactorSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_b64: str


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TwoFactorEnableRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class SessionOut(BaseModel):
    id: str
    created_at: str
    updated_at: str
    last_activity_at: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    is_active: bool = True


class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(min_length=1, max_length=100)


class ConsentStatus(BaseModel):
    consent_given: bool
    consent_given_at: str | None = None
