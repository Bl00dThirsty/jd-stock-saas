"""Admin-only routes — audit logs, user management, session management."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.core.audit import get_audit_logs
from app.core.deps import AdminUser, ClientIP, DbSession, UserAgent
from app.models.user import User, UserRole
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: DbSession,
    current_user: AdminUser,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List all users (admin only)."""
    stmt = select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.patch("/users/{user_id}/role")
async def set_user_role(
    user_id: str,
    role: UserRole,
    db: DbSession,
    current_user: AdminUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Change a user's role (admin only)."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = role
    return {"detail": f"User {user_id} role updated to {role.value}"}


@router.get("/audit-logs")
async def list_audit_logs(
    db: DbSession,
    current_user: AdminUser,
    user_id: str | None = Query(None),
    action: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """View audit logs (admin only)."""
    logs = await get_audit_logs(db, user_id=user_id, action=action, limit=limit, offset=offset)
    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
