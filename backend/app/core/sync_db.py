"""Synchronous SQLAlchemy session for Celery workers.

Celery tasks run outside the FastAPI event loop, so they use a plain sync
engine (psycopg) rather than the app's async engine.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

sync_engine = create_engine(settings.sync_database_url, pool_pre_ping=True, future=True)

SyncSessionLocal = sessionmaker(bind=sync_engine, class_=Session, expire_on_commit=False)
