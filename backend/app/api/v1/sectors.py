"""Sector breakdown endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import case, func, select

from app.core.deps import DbSession
from app.core.logging import get_logger
from app.models.stock import Stock
from app.schemas.analytics import SectorDetailOut, SectorStockRow

logger = get_logger(__name__)
router = APIRouter()


def _stock_row(s: Stock) -> SectorStockRow:
    return SectorStockRow(
        symbol=s.symbol, name=s.name, logo_url=s.logo_url,
        last_price=s.last_price, change_percent=s.change_percent,
        market_cap=s.market_cap, volume=s.volume,
    )


@router.get("", response_model=list[SectorDetailOut])
async def list_sectors(db: DbSession) -> list[SectorDetailOut]:
    # Aggregate per sector in one query
    agg = (await db.execute(
        select(
            Stock.sector,
            func.count().label("stock_count"),
            func.avg(Stock.change_percent).label("avg_chg"),
            func.sum(case((Stock.change_percent > 0, 1), else_=0)).label("advancers"),
            func.sum(case((Stock.change_percent < 0, 1), else_=0)).label("decliners"),
            func.sum(case((Stock.change_percent == 0, 1), else_=0)).label("unchanged"),
            func.coalesce(func.sum(Stock.market_cap), 0.0).label("total_cap"),
            func.coalesce(func.sum(Stock.volume), 0.0).label("total_vol"),
            func.avg(Stock.pe_ratio).label("avg_pe"),
            func.avg(Stock.dividend_yield).label("avg_div"),
        )
        .where(Stock.sector.is_not(None))
        .group_by(Stock.sector)
        .order_by(func.avg(Stock.change_percent).desc().nulls_last())
    )).all()

    if not agg:
        return []

    sector_names = [row.sector for row in agg]

    # Fetch all stocks in these sectors for top-lists (one round-trip)
    all_stocks = list(
        (await db.scalars(
            select(Stock)
            .where(Stock.sector.in_(sector_names))
            .order_by(Stock.market_cap.desc().nulls_last())
        )).all()
    )

    by_sector: dict[str, list[Stock]] = {}
    for s in all_stocks:
        by_sector.setdefault(s.sector, []).append(s)

    results: list[SectorDetailOut] = []
    for row in agg:
        stocks = by_sector.get(row.sector, [])
        top_cap = [_stock_row(s) for s in stocks[:5]]
        gainers = sorted(
            (s for s in stocks if s.change_percent is not None),
            key=lambda s: s.change_percent or 0, reverse=True,
        )[:3]
        losers = sorted(
            (s for s in stocks if s.change_percent is not None),
            key=lambda s: s.change_percent or 0,
        )[:3]
        results.append(SectorDetailOut(
            sector=row.sector,
            stock_count=row.stock_count,
            avg_change_percent=round(float(row.avg_chg or 0.0), 2),
            advancers=int(row.advancers or 0),
            decliners=int(row.decliners or 0),
            unchanged=int(row.unchanged or 0),
            total_market_cap=float(row.total_cap or 0.0),
            total_volume=float(row.total_vol or 0.0),
            avg_pe_ratio=round(float(row.avg_pe), 2) if row.avg_pe else None,
            avg_dividend_yield=round(float(row.avg_div), 2) if row.avg_div else None,
            top_by_cap=top_cap,
            top_gainers=[_stock_row(s) for s in gainers],
            top_losers=[_stock_row(s) for s in losers],
        ))
    return results


@router.get("/{sector}", response_model=SectorDetailOut)
async def get_sector(sector: str, db: DbSession) -> SectorDetailOut:
    all_sectors = await list_sectors(db)
    match = next((s for s in all_sectors if s.sector.lower() == sector.lower()), None)
    if match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sector '{sector}' not found")
    return match
