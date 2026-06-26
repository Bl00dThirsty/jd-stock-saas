"""Stock & market business logic."""

from datetime import UTC, datetime, timedelta

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.price import PriceHistory
from app.models.stock import Stock
from app.scrapers.base import Candle
from app.scrapers.yahoo import YahooScraper

logger = get_logger(__name__)

VALID_PERIODS = {"1d", "1w", "1m", "1y", "max"}

# How far back each period window reaches (days). "max" = no limit.
PERIOD_WINDOW_DAYS: dict[str, int | None] = {
    "1d": 4,
    "1w": 8,
    "1m": 32,
    "1y": 370,
    "max": None,
}


async def get_history(db: AsyncSession, stock: Stock, period: str) -> list[dict]:
    """Return candles from the DB for the requested period window.

    Falls back to a live Yahoo fetch only when nothing is stored.
    """
    query = select(PriceHistory).where(PriceHistory.stock_id == stock.id)
    window = PERIOD_WINDOW_DAYS.get(period)
    if window is not None:
        cutoff = datetime.now(UTC) - timedelta(days=window)
        query = query.where(PriceHistory.timestamp >= cutoff)

    rows = (await db.scalars(query.order_by(PriceHistory.timestamp.asc()))).all()

    if rows:
        return [
            {
                "timestamp": r.timestamp,
                "price": r.price,
                "open": r.open,
                "high": r.high,
                "low": r.low,
                "volume": r.volume,
            }
            for r in rows
        ]

    # No stored history → fetch live (off the event loop).
    logger.debug("No DB history for %s (period=%s) — fetching from Yahoo", stock.symbol, period)
    scraper = YahooScraper()
    candles: list[Candle] = await run_in_threadpool(
        scraper.fetch_history, stock.symbol, period, "1d"
    )
    return [
        {
            "timestamp": c.timestamp,
            "price": c.price,
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "volume": c.volume,
        }
        for c in candles
    ]


async def market_summary(db: AsyncSession, limit: int = 5) -> dict:
    """Compute advancers/decliners, total volume and top movers."""
    total_volume = await db.scalar(select(func.coalesce(func.sum(Stock.volume), 0.0)))
    total_market_cap = await db.scalar(select(func.coalesce(func.sum(Stock.market_cap), 0.0)))
    avg_change = await db.scalar(select(func.avg(Stock.change_percent)))
    advancers = await db.scalar(select(func.count()).where(Stock.change_percent > 0))
    decliners = await db.scalar(select(func.count()).where(Stock.change_percent < 0))
    unchanged = await db.scalar(select(func.count()).where(Stock.change_percent == 0))

    gainers = (
        await db.scalars(
            select(Stock)
            .where(Stock.change_percent.is_not(None))
            .order_by(Stock.change_percent.desc())
            .limit(limit)
        )
    ).all()
    losers = (
        await db.scalars(
            select(Stock)
            .where(Stock.change_percent.is_not(None))
            .order_by(Stock.change_percent.asc())
            .limit(limit)
        )
    ).all()

    # One query for the movers' recent closes → inline sparklines.
    mover_ids = [s.id for s in (*gainers, *losers)]
    spark_map: dict[int, list[float]] = {}
    if mover_ids:
        points = await db.scalars(
            select(PriceHistory)
            .where(PriceHistory.stock_id.in_(mover_ids))
            .order_by(PriceHistory.timestamp.asc())
        )
        for p in points:
            spark_map.setdefault(p.stock_id, []).append(round(p.price, 2))
        spark_map = {sid: series[-16:] for sid, series in spark_map.items()}

    # Daily market totals → KPI sparkline + month-over-month deltas.
    day = func.date(PriceHistory.timestamp).label("d")
    daily_rows = (
        await db.execute(
            select(
                day,
                func.sum(PriceHistory.price * func.coalesce(Stock.shares_outstanding, 0.0)),
                func.coalesce(func.sum(PriceHistory.volume), 0.0),
            )
            .join(Stock, Stock.id == PriceHistory.stock_id)
            .group_by(day)
            .order_by(day)
        )
    ).all()
    mcap_series = [float(r[1] or 0.0) for r in daily_rows]
    value_series = [float(r[2] or 0.0) for r in daily_rows]

    def month_delta(series: list[float], lookback: int = 30) -> float:
        if len(series) < 2:
            return 0.0
        base = series[max(0, len(series) - 1 - lookback)]
        return round((series[-1] - base) / base * 100, 2) if base else 0.0

    # Sector performance aggregate.
    sector_rows = (
        await db.execute(
            select(
                Stock.sector,
                func.avg(Stock.change_percent),
                func.count(),
                func.coalesce(func.sum(Stock.market_cap), 0.0),
                func.sum(case((Stock.change_percent > 0, 1), else_=0)),
                func.sum(case((Stock.change_percent < 0, 1), else_=0)),
            )
            .where(Stock.sector.is_not(None), Stock.change_percent.is_not(None))
            .group_by(Stock.sector)
        )
    ).all()
    sectors = sorted(
        (
            {
                "sector": row[0],
                "avg_change_percent": round(float(row[1] or 0.0), 2),
                "count": row[2],
                "total_market_cap": float(row[3] or 0.0),
                "advancers": int(row[4] or 0),
                "decliners": int(row[5] or 0),
            }
            for row in sector_rows
        ),
        key=lambda s: s["avg_change_percent"],
        reverse=True,
    )

    def mover(s: Stock) -> dict:
        return {
            "symbol": s.symbol,
            "name": s.name,
            "logo_url": s.logo_url,
            "last_price": s.last_price,
            "change": s.change,
            "change_percent": s.change_percent,
            "volume": s.volume,
            "market_cap": s.market_cap,
            "spark": spark_map.get(s.id, []),
        }

    return {
        "total_volume": float(total_volume or 0.0),
        "total_market_cap": float(total_market_cap or 0.0),
        "avg_change_percent": round(float(avg_change or 0.0), 2),
        "market_cap_change_pct": month_delta(mcap_series),
        "value_change_pct": month_delta(value_series),
        "market_cap_series": [round(v, 2) for v in mcap_series[-30:]],
        "advancers": advancers or 0,
        "decliners": decliners or 0,
        "unchanged": unchanged or 0,
        "top_gainers": [mover(s) for s in gainers],
        "top_losers": [mover(s) for s in losers],
        "sectors": sectors,
    }
