"""Application settings, loaded from environment / .env via pydantic-settings."""

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ─── App ───
    PROJECT_NAME: str = "NGX Stock SaaS"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # ─── Database / Redis ───
    DATABASE_URL: str = "postgresql+asyncpg://ngx:ngx_password@db:5432/ngx_saas"
    REDIS_URL: str = "redis://redis:6379/0"

    # ─── Google OAuth ───
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # ─── Apple OAuth (Sign in with Apple) ───
    # APPLE_CLIENT_ID is the Services ID (e.g. com.vortex.web). APPLE_PRIVATE_KEY
    # is the PEM contents of the .p8 key downloaded from the Apple Developer portal.
    APPLE_CLIENT_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_ID: str = ""
    APPLE_PRIVATE_KEY: str = ""
    APPLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/apple/callback"

    # ─── JWT ───
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Logging ───
    LOG_LEVEL: str = "info"  # debug | info | warning | error | critical

    # ─── Market data ───
    NGXPULSE_API_KEY: str = ""
    NGXPULSE_BASE_URL: str = "https://www.ngxpulse.ng/api/ngxdata"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @model_validator(mode="after")
    def _guard_production_secrets(self) -> "Settings":
        """Refuse to boot outside development with placeholder secrets."""
        if self.ENVIRONMENT != "development" and self.JWT_SECRET_KEY == "change-me":
            raise ValueError(
                "JWT_SECRET_KEY must be overridden when ENVIRONMENT is not 'development'"
            )
        return self

    @property
    def sync_database_url(self) -> str:
        """Sync DSN (psycopg) used by Alembic & Celery tasks."""
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg")

    @property
    def apple_enabled(self) -> bool:
        """True once all Apple Developer credentials are configured."""
        return bool(
            self.APPLE_CLIENT_ID
            and self.APPLE_TEAM_ID
            and self.APPLE_KEY_ID
            and self.APPLE_PRIVATE_KEY
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
