"""PriceAlert model — notify a user when a stock crosses a target price."""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.common import TimestampMixin

if TYPE_CHECKING:
    from app.models.stock import Stock
    from app.models.user import User


class AlertDirection(enum.StrEnum):
    above = "above"
    below = "below"


class PriceAlert(Base, TimestampMixin):
    __tablename__ = "price_alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    stock_id: Mapped[int] = mapped_column(
        ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False
    )
    target_price: Mapped[float] = mapped_column(Float, nullable=False)
    direction: Mapped[AlertDirection] = mapped_column(
        Enum(AlertDirection, name="alert_direction"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="alerts")
    stock: Mapped["Stock"] = relationship()
