"""Stock model — one row per NGX-listed equity."""

from typing import TYPE_CHECKING

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.common import TimestampMixin

if TYPE_CHECKING:
    from app.models.news import News
    from app.models.price import PriceHistory


class Stock(Base, TimestampMixin):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Bare NGX symbol, e.g. "DANGCEM" (Yahoo ticker is "<symbol>.LAGOS").
    symbol: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(128), index=True)
    industry: Mapped[str | None] = mapped_column(String(128))

    # Logo URL (from Yahoo Finance, populated by the profile collector).
    logo_url: Mapped[str | None] = mapped_column(String(512))

    # Snapshot fundamentals (refreshed by the profile collector).
    market_cap: Mapped[float | None] = mapped_column(Float)
    shares_outstanding: Mapped[float | None] = mapped_column(Float)
    pe_ratio: Mapped[float | None] = mapped_column(Float)
    eps: Mapped[float | None] = mapped_column(Float)
    dividend_yield: Mapped[float | None] = mapped_column(Float)
    week52_high: Mapped[float | None] = mapped_column(Float)
    week52_low: Mapped[float | None] = mapped_column(Float)

    # Latest quote (denormalised for fast list rendering).
    last_price: Mapped[float | None] = mapped_column(Float)
    change: Mapped[float | None] = mapped_column(Float)
    change_percent: Mapped[float | None] = mapped_column(Float)
    volume: Mapped[float | None] = mapped_column(Float)

    @property
    def yahoo_ticker(self) -> str:
        return f"{self.symbol}.LAGOS"

    prices: Mapped[list["PriceHistory"]] = relationship(
        back_populates="stock", cascade="all, delete-orphan"
    )
    news: Mapped[list["News"]] = relationship(
        back_populates="stock", cascade="all, delete-orphan"
    )
