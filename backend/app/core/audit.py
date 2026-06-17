"""Audit-logging helpers — log critical user actions to the database."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    user_id: UUID | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: str | None = None,
) -> AuditLog:
    """Persist an audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_audit_logs(
    db: AsyncSession,
    user_id: UUID | None = None,
    action: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    """Retrieve audit logs, optionally filtered."""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
