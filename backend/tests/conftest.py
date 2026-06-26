"""Shared pytest fixtures.

DB-backed tests run against a real Postgres (the models use Postgres-specific
types — UUID / JSONB — that don't exist on SQLite). Point them at a throwaway
database via ``TEST_DATABASE_URL``; it defaults to a ``*_test`` sibling of the
configured ``DATABASE_URL``. Pure-logic tests don't request the ``db``/``client``
fixtures and so never touch Postgres.
"""

import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.models  # noqa: F401 — register every model on Base.metadata
from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app


def _test_db_url() -> str:
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return explicit
    base, _, _name = settings.DATABASE_URL.rpartition("/")
    return f"{base}/ngx_saas_test"


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """A clean schema + session per test (create_all → yield → drop_all)."""
    engine = create_async_engine(_test_db_url(), poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncClient:
    """An ASGI test client whose requests use the per-test ``db`` session."""

    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
