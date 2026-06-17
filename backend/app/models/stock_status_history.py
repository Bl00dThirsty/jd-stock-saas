"""Stock status lifecycle journal (LISTING / SUSPENDED / DELISTED …).

See schema-enrichment-prompt.md §1 (stock_status_history). One row per
transition, with the reason memo and an optimistic-locking rowstamp.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.rowstamp import RowstampMixin
from app.models.common import TimestampMixin

if TYPE_CHECKING:
    from app.models.stock import Stock


class StockStatusHistory(Base, TimestampMixin, RowstampMixin):
    __tablename__ = "stock_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(
        ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    statusdate: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    changeby: Mapped[str | None] = mapped_column(String(64))
    memo: Mapped[str | None] = mapped_column(String(512))

    stock: Mapped["Stock"] = relationship(back_populates="status_history")
