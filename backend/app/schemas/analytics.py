"""Analytics response schemas."""

from datetime import datetime

from pydantic import BaseModel


class ReturnMetricsOut(BaseModel):
    period: str
    total_return_pct: float
    cagr_pct: float
    annualized_vol_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    max_drawdown_start: datetime | None
    max_drawdown_end: datetime | None
    best_day_pct: float
    worst_day_pct: float
    trading_days: int
    data_sufficient: bool


class VolumeAnomalyOut(BaseModel):
    z_score: float
    avg_volume_20d: float
    current_volume: float
    is_anomaly: bool
    direction: str  # "spike" | "drought" | "normal"


class SRLevelOut(BaseModel):
    price: float
    strength: int
    level_type: str  # "support" | "resistance"
    distance_pct: float


class StockAnalyticsOut(BaseModel):
    symbol: str
    returns: list[ReturnMetricsOut]
    volume_anomaly: VolumeAnomalyOut | None
    support_resistance: list[SRLevelOut]


# ── Sector detail ─────────────────────────────────────────────────────────────


class SectorStockRow(BaseModel):
    symbol: str
    name: str
    logo_url: str | None = None
    last_price: float | None = None
    change_percent: float | None = None
    market_cap: float | None = None
    volume: float | None = None


class SectorDetailOut(BaseModel):
    sector: str
    stock_count: int
    avg_change_percent: float
    advancers: int
    decliners: int
    unchanged: int
    total_market_cap: float
    total_volume: float
    avg_pe_ratio: float | None
    avg_dividend_yield: float | None
    top_by_cap: list[SectorStockRow]  # top 5 by market cap
    top_gainers: list[SectorStockRow]  # top 3 gainers today
    top_losers: list[SectorStockRow]  # top 3 losers today
