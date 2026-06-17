"""Enterprise metadata mixins (Maximo/OSLC-inspired).

Composable column groups so every enriched entity carries the same spine:
sphere (siteid/orgid), status lifecycle, audit (changeby/changedate) and an
optimistic-locking ``_rowstamp``. See schema-enrichment-prompt.md §8f.
"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.rowstamp import RowstampMixin


class SphereMixin:
    """Organisational dimensions: site (market) and org (legal/regulator)."""

    siteid: Mapped[str | None] = mapped_column(String(32), index=True, default=None)
    orgid: Mapped[str | None] = mapped_column(String(32), default=None)


class AuditableMixin:
    """Who last changed the row, when, plus a free-text description."""

    changeby: Mapped[str | None] = mapped_column(String(64), default=None)
    changedate: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    description: Mapped[str | None] = mapped_column(String(512), default=None)


class StatusMixin:
    """Explicit status + lifecycle bookkeeping (default ``ACTIVE``)."""

    status: Mapped[str] = mapped_column(
        String(32), default="ACTIVE", server_default="ACTIVE", nullable=False, index=True
    )
    statusdate: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    status_memo: Mapped[str | None] = mapped_column(String(512), default=None)


class EnterpriseMixin(RowstampMixin, SphereMixin, AuditableMixin, StatusMixin):
    """Full OSLC-style metadata spine for a first-class entity."""
