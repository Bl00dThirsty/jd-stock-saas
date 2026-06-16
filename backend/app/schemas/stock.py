"""Stock & market schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StockBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    name: str
    sector: str | None = None
    last_price: float | None = None
    change: float | None = None
    change_percent: float | None = None
    volume: float | None = None
    market_cap: float | None = None


class StockDetail(StockBase):
    industry: str | None = None
    shares_outstanding: float | None = None
    pe_ratio: float | None = None
    eps: float | None = None
    dividend_yield: float | None = None
    week52_high: float | None = None
    week52_low: float | None = None
    last_updated: datetime | None = None


class PricePoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    price: float
    open: float | None = None
    high: float | None = None
    low: float | None = None
    volume: float | None = None


class StockHistory(BaseModel):
    symbol: str
    period: str
    points: list[PricePoint]


class MarketMover(BaseModel):
    symbol: str
    name: str
    last_price: float | None = None
    change: float | None = None
    change_percent: float | None = None
    volume: float | None = None
    market_cap: float | None = None
    # Recent closing prices (oldest→newest) for an inline sparkline.
    spark: list[float] = []


class SectorPerf(BaseModel):
    sector: str
    avg_change_percent: float
    advancers: int
    decliners: int
    total_market_cap: float
    count: int


class MarketSummary(BaseModel):
    total_volume: float
    total_market_cap: float
    avg_change_percent: float
    # Month-over-month deltas (for the "vs last month" KPI captions).
    market_cap_change_pct: float
    value_change_pct: float
    # Daily total-market-cap series (~30 pts) for the KPI sparkline.
    market_cap_series: list[float] = []
    advancers: int
    decliners: int
    unchanged: int
    top_gainers: list[MarketMover]
    top_losers: list[MarketMover]
    sectors: list[SectorPerf]
