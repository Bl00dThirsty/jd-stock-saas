"""Stock model — one row per NGX-listed equity."""

from typing import TYPE_CHECKING

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.meta import EnterpriseMixin
from app.models.common import TimestampMixin

if TYPE_CHECKING:
    from app.models.news import News
    from app.models.price import PriceHistory
    from app.models.stock_attribute import StockAttribute
    from app.models.stock_status_history import StockStatusHistory


class Stock(Base, TimestampMixin, EnterpriseMixin):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Bare NGX symbol, e.g. "DANGCEM" (Yahoo ticker is "<symbol>.LAGOS").
    symbol: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(128), index=True)
    industry: Mapped[str | None] = mapped_column(String(128))

    # ── Classification + hierarchy (OSLC asset model) ──
    # Soft link to classification.classstructureid (e.g. "EQUITY", "BOND", "ETF").
    classstructureid: Mapped[str | None] = mapped_column(String(64), index=True)
    # e.g. "NGX \\ BANKING \\ GTCO" — sub-tree navigation without recursive CTEs.
    hierarchypath: Mapped[str | None] = mapped_column(String(512), index=True)
    # Stock lifecycle starts LISTING (overrides the mixin's ACTIVE default).
    status: Mapped[str] = mapped_column(
        String(32), default="LISTING", server_default="LISTING", nullable=False, index=True
    )

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
    attributes: Mapped[list["StockAttribute"]] = relationship(
        back_populates="stock", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["StockStatusHistory"]] = relationship(
        back_populates="stock", cascade="all, delete-orphan"
    )
