"""Auth-related schemas."""

from pydantic import BaseModel, Field


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


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
    ip_address: str | None = None
    user_agent: str | None = None
