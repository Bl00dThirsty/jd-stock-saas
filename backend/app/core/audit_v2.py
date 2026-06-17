"""Enriched audit — field-level change journal into ``object_history``.

Complements the action-level ``app.core.audit`` (login, export…). Use this to
record *what changed* on a business object, grouped by a transaction id.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.object_history import ObjectHistory


def new_transaction_id() -> str:
    """Group several field changes belonging to one business operation."""
    return uuid.uuid4().hex


async def record_change(
    db: AsyncSession,
    object_type: str,
    object_id: str,
    field_name: str | None = None,
    old_value: object = None,
    new_value: object = None,
    changeby: uuid.UUID | None = None,
    transaction_id: str | None = None,
    reason: str | None = None,
    source: str = "API",
) -> ObjectHistory:
    entry = ObjectHistory(
        object_type=object_type,
        object_id=str(object_id),
        field_name=field_name,
        old_value=None if old_value is None else str(old_value),
        new_value=None if new_value is None else str(new_value),
        changeby=changeby,
        transaction_id=transaction_id,
        reason=reason,
        source=source,
    )
    db.add(entry)
    await db.flush()
    return entry


async def record_changes(
    db: AsyncSession,
    object_type: str,
    object_id: str,
    changes: dict[str, tuple[object, object]],
    changeby: uuid.UUID | None = None,
    reason: str | None = None,
    source: str = "API",
) -> str:
    """Record a dict of ``field -> (old, new)`` under one transaction id."""
    txn = new_transaction_id()
    for field, (old, new) in changes.items():
        if old == new:
            continue
        await record_change(
            db, object_type, object_id, field, old, new,
            changeby=changeby, transaction_id=txn, reason=reason, source=source,
        )
    return txn
