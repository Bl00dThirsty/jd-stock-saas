"""Stock & market endpoints."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.core.deps import DbSession
from app.models.stock import Stock
from app.schemas.stock import (
    MarketSummary,
    StockBase,
    StockDetail,
    StockHistory,
)
from app.services import stock_service

router = APIRouter()
market_router = APIRouter()


async def _get_stock_or_404(db: DbSession, symbol: str) -> Stock:
    stock = await db.scalar(select(Stock).where(Stock.symbol == symbol.upper()))
    if stock is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown symbol '{symbol}'"
        )
    return stock


@router.get("", response_model=list[StockBase])
async def list_stocks(
    db: DbSession,
    sector: str | None = None,
    search: str | None = None,
    limit: int = Query(200, le=500),
) -> list[Stock]:
    query = select(Stock)
    if sector:
        query = query.where(Stock.sector == sector)
    if search:
        term = f"%{search}%"
        query = query.where(or_(Stock.symbol.ilike(term), Stock.name.ilike(term)))
    query = query.order_by(Stock.symbol).limit(limit)
    return list((await db.scalars(query)).all())


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


@market_router.get("/summary", response_model=MarketSummary)
async def get_market_summary(db: DbSession) -> MarketSummary:
    return MarketSummary(**await stock_service.market_summary(db))
