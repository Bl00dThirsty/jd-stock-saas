"""Application settings, loaded from environment / .env via pydantic-settings."""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ─── App ───
    PROJECT_NAME: str = "NGX Stock SaaS"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # ─── Database / Redis ───
    DATABASE_URL: str = "postgresql+asyncpg://ngx:ngx_password@db:5432/ngx_saas"
    REDIS_URL: str = "redis://redis:6379/0"

    # ─── Google OAuth ───
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # ─── JWT ───
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Market data ───
    NGXPULSE_API_KEY: str = ""
    NGXPULSE_BASE_URL: str = "https://www.ngxpulse.ng/api/ngxdata"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def sync_database_url(self) -> str:
        """Sync DSN (psycopg) used by Alembic & Celery tasks."""
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
