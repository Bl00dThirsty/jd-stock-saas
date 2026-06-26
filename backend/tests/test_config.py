"""Settings validation — environment whitelist + secret guard."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_rejects_unknown_environment():
    with pytest.raises(ValidationError):
        Settings(ENVIRONMENT="banana")


def test_rejects_placeholder_secret_outside_dev():
    with pytest.raises(ValidationError):
        Settings(ENVIRONMENT="production", JWT_SECRET_KEY="change-me")


def test_allows_placeholder_secret_in_development():
    s = Settings(ENVIRONMENT="development", JWT_SECRET_KEY="change-me")
    assert s.ENVIRONMENT == "development"


def test_allows_real_secret_in_production():
    s = Settings(ENVIRONMENT="production", JWT_SECRET_KEY="a-real-production-secret")
    assert s.ENVIRONMENT == "production"
