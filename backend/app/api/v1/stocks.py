"""Stock & market endpoints."""

from dataclasses import asdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.core.deps import DbSession
from app.core.logging import get_logger
from app.models.price import PriceHistory
from app.models.stock import Stock
from app.schemas.analytics import ReturnMetricsOut, SRLevelOut, StockAnalyticsOut, VolumeAnomalyOut
from app.schemas.stock import (
    MarketSummary,
    StockDetail,
    StockHistory,
    StockRow,
)
from app.services import stock_service
from app.services.analytics_service import (
    compute_return_metrics,
    compute_support_resistance,
    compute_volume_anomaly,
)

logger = get_logger(__name__)

router = APIRouter()
market_router = APIRouter()


async def _get_stock_or_404(db: DbSession, symbol: str) -> Stock:
    stock = await db.scalar(select(Stock).where(Stock.symbol == symbol.upper()))
    if stock is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown symbol '{symbol}'"
        )
    return stock


@router.get("", response_model=list[StockRow])
async def list_stocks(
    db: DbSession,
    sector: str | None = None,
    search: str | None = None,
    spark: bool = False,
    limit: int = Query(500, le=500),
) -> list[StockRow]:
    query = select(Stock)
    if sector:
        query = query.where(Stock.sector == sector)
    if search:
        term = f"%{search}%"
        query = query.where(or_(Stock.symbol.ilike(term), Stock.name.ilike(term)))
    query = query.order_by(Stock.symbol).limit(limit)
    stocks = list((await db.scalars(query)).all())

    spark_map: dict[int, list[float]] = {}
    if spark and stocks:
        ids = [s.id for s in stocks]
        points = await db.scalars(
            select(PriceHistory)
            .where(PriceHistory.stock_id.in_(ids))
            .order_by(PriceHistory.timestamp.asc())
        )
        for p in points:
            spark_map.setdefault(p.stock_id, []).append(round(p.price, 2))
        spark_map = {sid: series[-24:] for sid, series in spark_map.items()}

    rows: list[StockRow] = []
    for s in stocks:
        row = StockRow.model_validate(s)
        row.spark = spark_map.get(s.id, [])
        rows.append(row)
    return rows


@router.get("/{symbol}", response_model=StockDetail)
async def get_stock(db: DbSession, symbol: str) -> Stock:
    return await _get_stock_or_404(db, symbol)


@router.get("/{symbol}/history", response_model=StockHistory)
async def get_history(
    db: DbSession,
    symbol: str,
    period: str = Query("1m", pattern="^(1d|1w|1m|1y|max)$"),
) -> StockHistory:
    stock = await _get_stock_or_404(db, symbol)
    points = await stock_service.get_history(db, stock, period)
    return StockHistory(symbol=stock.symbol, period=period, points=points)


@router.get("/{symbol}/financials")
async def get_financials(db: DbSession, symbol: str) -> dict:
    stock = await _get_stock_or_404(db, symbol)
    return {
        "symbol": stock.symbol,
        "market_cap": stock.market_cap,
        "pe_ratio": stock.pe_ratio,
        "eps": stock.eps,
        "dividend_yield": stock.dividend_yield,
        "shares_outstanding": stock.shares_outstanding,
        "week52_high": stock.week52_high,
        "week52_low": stock.week52_low,
    }


@router.get("/{symbol}/analytics", response_model=StockAnalyticsOut)
async def get_analytics(db: DbSession, symbol: str) -> StockAnalyticsOut:
    stock = await _get_stock_or_404(db, symbol)
    all_prices = list(
        (await db.scalars(
            select(PriceHistory)
            .where(PriceHistory.stock_id == stock.id)
            .order_by(PriceHistory.timestamp.asc())
        )).all()
    )

    prices = [p.price for p in all_prices]
    timestamps = [p.timestamp for p in all_prices]
    volumes = [p.volume or 0.0 for p in all_prices]

    now = datetime.now(timezone.utc)

    period_windows: dict[str, int | None] = {"1y": 365, "3y": 1095, "5y": 1825, "max": None}
    returns: list[ReturnMetricsOut] = []
    for period_name, days in period_windows.items():
        if days:
            cutoff = now - timedelta(days=days)
            idx = next((i for i, t in enumerate(timestamps) if t >= cutoff), None)
            if idx is None or len(prices) - idx < 2:
                continue
            p_slice, t_slice = prices[idx:], timestamps[idx:]
        else:
            p_slice, t_slice = prices, timestamps
        m = compute_return_metrics(p_slice, t_slice, period_name)
        returns.append(ReturnMetricsOut(**asdict(m)))

    vol_anomaly: VolumeAnomalyOut | None = None
    if volumes and volumes[-1]:
        va = compute_volume_anomaly(volumes[-1], volumes[:-1])
        vol_anomaly = VolumeAnomalyOut(**asdict(va))

    sr_raw = compute_support_resistance(prices, timestamps)
    sr_levels = [SRLevelOut(**asdict(lv)) for lv in sr_raw]

    logger.debug(
        "Analytics for %s: %d periods, vol_anomaly=%s, %d S/R levels",
        symbol, len(returns), vol_anomaly is not None, len(sr_levels),
    )

    return StockAnalyticsOut(
        symbol=stock.symbol,
        returns=returns,
        volume_anomaly=vol_anomaly,
        support_resistance=sr_levels,
    )


@market_router.get("/summary", response_model=MarketSummary)
async def get_market_summary(db: DbSession) -> MarketSummary:
    return MarketSummary(**await stock_service.market_summary(db))
