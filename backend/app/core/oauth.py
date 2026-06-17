"""Authlib OAuth client registry (Google + Apple)."""

import time

from authlib.integrations.starlette_client import OAuth
from jose import jwt as jose_jwt

from app.core.config import settings

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def apple_client_secret() -> str:
    """Build the short-lived ES256 JWT Apple requires as the OAuth client secret.

    Signed with the .p8 private key (APPLE_PRIVATE_KEY); valid up to 6 months.
    Regenerated on app start.
    """
    now = int(time.time())
    payload = {
        "iss": settings.APPLE_TEAM_ID,
        "iat": now,
        "exp": now + 86400 * 180,
        "aud": "https://appleid.apple.com",
        "sub": settings.APPLE_CLIENT_ID,
    }
    return jose_jwt.encode(
        payload,
        settings.APPLE_PRIVATE_KEY,
        algorithm="ES256",
        headers={"kid": settings.APPLE_KEY_ID},
    )


# Registered only once Apple Developer credentials are present (see config).
if settings.apple_enabled:
    oauth.register(
        name="apple",
        client_id=settings.APPLE_CLIENT_ID,
        client_secret=apple_client_secret(),
        server_metadata_url="https://appleid.apple.com/.well-known/openid-configuration",
        client_kwargs={"scope": "name email", "response_mode": "form_post"},
    )
