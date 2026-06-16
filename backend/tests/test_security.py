"""JWT creation / verification round-trips."""

from app.core.security import (
    ACCESS,
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_access_token_roundtrip():
    token = create_access_token("user-123", role="trader")
    payload = decode_token(token, expected_type=ACCESS)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["role"] == "trader"
    assert payload["type"] == ACCESS


def test_refresh_token_roundtrip():
    token = create_refresh_token("user-123")
    payload = decode_token(token, expected_type=REFRESH)
    assert payload is not None
    assert payload["sub"] == "user-123"


def test_wrong_type_rejected():
    access = create_access_token("user-123")
    # Decoding an access token while expecting a refresh token must fail.
    assert decode_token(access, expected_type=REFRESH) is None


def test_garbage_token_rejected():
    assert decode_token("not-a-jwt") is None
