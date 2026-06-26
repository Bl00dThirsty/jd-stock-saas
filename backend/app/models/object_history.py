"""Unified object history — field-level change journal across all entities.

See schema-enrichment-prompt.md §7. One row per field change, grouped by an
optional ``transaction_id`` so a single business operation can be reconstructed.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ObjectHistory(Base):
    __tablename__ = "object_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    object_type: Mapped[str] = mapped_column(String(32), nullable=False)
    object_id: Mapped[str] = mapped_column(String(64), nullable=False)
    field_name: Mapped[str | None] = mapped_column(String(64))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    changeby: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    changedate: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    transaction_id: Mapped[str | None] = mapped_column(String(64), index=True)
    reason: Mapped[str | None] = mapped_column(String(512))
    source: Mapped[str] = mapped_column(String(32), default="API", server_default="API")

    __table_args__ = (Index("ix_object_history_object", "object_type", "object_id", "changedate"),)
