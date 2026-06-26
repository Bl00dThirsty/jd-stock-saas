"""Pure-Python financial analytics.

All functions are stateless and dependency-free (stdlib only) so they can be
tested offline and run inside an async endpoint without blocking the event loop.

Nigeria-specific defaults:
  RF_ANNUAL = 0.17  (approx. 2024 CBN MPR / T-bill rate)
  TRADING_DAYS = 252
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime

# ── Constants ─────────────────────────────────────────────────────────────────

RF_ANNUAL = 0.17  # Nigeria risk-free rate (CBN benchmark 2024)
TRADING_DAYS = 252  # standard annual trading-day count
MIN_POINTS = 20  # minimum data points for "data_sufficient = True"
SR_WINDOW = 5  # local-extrema look-back window (sessions)
SR_CLUSTER_PCT = 0.015  # levels within 1.5% of each other → same cluster
ANOMALY_ZSCORE = 2.5  # z-score threshold for volume anomaly


# ── Helpers ───────────────────────────────────────────────────────────────────


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / (len(values) - 1))


def _daily_returns(prices: list[float]) -> list[float]:
    return [
        (prices[i] - prices[i - 1]) / prices[i - 1]
        for i in range(1, len(prices))
        if prices[i - 1] != 0
    ]


# ── Return metrics ────────────────────────────────────────────────────────────


@dataclass
class ReturnMetrics:
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


def compute_return_metrics(
    prices: list[float],
    timestamps: list[datetime],
    period: str,
    rf_annual: float = RF_ANNUAL,
) -> ReturnMetrics:
    """Compute all return metrics for a price series.

    Handles edge cases gracefully: returns a zeroed-out struct when data is
    insufficient rather than raising.
    """
    _empty = ReturnMetrics(
        period=period,
        total_return_pct=0.0,
        cagr_pct=0.0,
        annualized_vol_pct=0.0,
        sharpe_ratio=0.0,
        max_drawdown_pct=0.0,
        max_drawdown_start=None,
        max_drawdown_end=None,
        best_day_pct=0.0,
        worst_day_pct=0.0,
        trading_days=len(prices),
        data_sufficient=False,
    )
    if len(prices) < 2 or len(prices) != len(timestamps):
        return _empty

    start_price, end_price = prices[0], prices[-1]
    if start_price <= 0:
        return _empty

    years = max((timestamps[-1] - timestamps[0]).days / 365.25, 1 / TRADING_DAYS)
    total_return = (end_price / start_price - 1) * 100
    cagr = ((end_price / start_price) ** (1 / years) - 1) * 100

    daily = _daily_returns(prices)
    vol = _std(daily) * math.sqrt(TRADING_DAYS) * 100 if len(daily) >= 2 else 0.0

    rf_daily = rf_annual / TRADING_DAYS
    mean_d, std_d = _mean(daily), _std(daily)
    sharpe = (mean_d - rf_daily) / std_d * math.sqrt(TRADING_DAYS) if std_d > 0 else 0.0

    # Maximum drawdown (peak-to-trough)
    peak, peak_ts = prices[0], timestamps[0]
    max_dd, dd_start, dd_end = 0.0, timestamps[0], timestamps[0]
    for price, ts in zip(prices, timestamps, strict=False):
        if price > peak:
            peak, peak_ts = price, ts
        dd = (price - peak) / peak * 100
        if dd < max_dd:
            max_dd, dd_start, dd_end = dd, peak_ts, ts

    best = max(daily) * 100 if daily else 0.0
    worst = min(daily) * 100 if daily else 0.0

    return ReturnMetrics(
        period=period,
        total_return_pct=round(total_return, 2),
        cagr_pct=round(cagr, 2),
        annualized_vol_pct=round(vol, 2),
        sharpe_ratio=round(sharpe, 2),
        max_drawdown_pct=round(max_dd, 2),
        max_drawdown_start=dd_start,
        max_drawdown_end=dd_end,
        best_day_pct=round(best, 2),
        worst_day_pct=round(worst, 2),
        trading_days=len(prices),
        data_sufficient=len(prices) >= MIN_POINTS,
    )


# ── Volume anomaly ────────────────────────────────────────────────────────────


@dataclass
class VolumeAnomaly:
    z_score: float
    avg_volume_20d: float
    current_volume: float
    is_anomaly: bool
    direction: str  # "spike" | "drought" | "normal"


def compute_volume_anomaly(
    current_volume: float,
    recent_volumes: list[float],
    window: int = 20,
    threshold: float = ANOMALY_ZSCORE,
) -> VolumeAnomaly:
    vols = [v for v in recent_volumes[-window:] if v and v > 0]
    if len(vols) < 5 or not current_volume:
        return VolumeAnomaly(
            z_score=0.0,
            avg_volume_20d=current_volume,
            current_volume=current_volume,
            is_anomaly=False,
            direction="normal",
        )
    avg = _mean(vols)
    std = _std(vols)
    z = (current_volume - avg) / std if std > 0 else 0.0
    direction = "spike" if z > threshold else "drought" if z < -threshold else "normal"
    return VolumeAnomaly(
        z_score=round(z, 2),
        avg_volume_20d=round(avg, 0),
        current_volume=current_volume,
        is_anomaly=abs(z) >= threshold,
        direction=direction,
    )


# ── Support & resistance ──────────────────────────────────────────────────────


@dataclass
class SRLevel:
    price: float
    strength: int  # number of distinct touches clustered here
    level_type: str  # "support" | "resistance"
    distance_pct: float  # % away from current price (positive = above)


def compute_support_resistance(
    prices: list[float],
    timestamps: list[datetime],
    window: int = SR_WINDOW,
    cluster_pct: float = SR_CLUSTER_PCT,
    n_levels: int = 8,
) -> list[SRLevel]:
    """Identify key support/resistance levels using local extrema clustering.

    Algorithm:
    1. Find local minima and maxima within a rolling window.
    2. Cluster nearby extrema (within cluster_pct of each other).
    3. Classify each cluster as support or resistance relative to current price.
    4. Rank by strength (touch count), return top n.
    """
    if len(prices) < window * 2 + 1:
        return []

    local_min: list[float] = []
    local_max: list[float] = []

    for i in range(window, len(prices) - window):
        p = prices[i]
        neighbors_before = prices[i - window : i]
        neighbors_after = prices[i + 1 : i + window + 1]
        if all(p <= nb for nb in neighbors_before) and all(p <= na for na in neighbors_after):
            local_min.append(p)
        elif all(p >= nb for nb in neighbors_before) and all(p >= na for na in neighbors_after):
            local_max.append(p)

    def cluster_points(points: list[float]) -> list[tuple[float, int]]:
        if not points:
            return []
        pts = sorted(points)
        clusters: list[list[float]] = []
        for p in pts:
            placed = False
            for c in clusters:
                ref = _mean(c)
                if ref > 0 and abs(p - ref) / ref <= cluster_pct:
                    c.append(p)
                    placed = True
                    break
            if not placed:
                clusters.append([p])
        return [(_mean(c), len(c)) for c in clusters]

    current = prices[-1]
    levels: list[SRLevel] = []

    for center, strength in cluster_points(local_min + local_max):
        distance_pct = (center - current) / current * 100 if current > 0 else 0.0
        if center <= current:
            level_type = "support"
        else:
            level_type = "resistance"
        levels.append(
            SRLevel(
                price=round(center, 2),
                strength=strength,
                level_type=level_type,
                distance_pct=round(distance_pct, 2),
            )
        )

    # Sort: strongest first, then by proximity to current price
    levels.sort(key=lambda lvl: (-lvl.strength, abs(lvl.distance_pct)))
    return levels[:n_levels]
