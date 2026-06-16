"""Financial-news endpoints."""

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.core.deps import DbSession
from app.models.news import News
from app.models.stock import Stock
from app.schemas.news import NewsOut

router = APIRouter()


@router.get("", response_model=list[NewsOut])
async def list_news(
    db: DbSession,
    stock: str | None = Query(None, description="Filter by ticker symbol"),
    sector: str | None = Query(None, description="Filter by sector"),
    limit: int = Query(50, le=100),
) -> list[dict]:
    query = select(News).order_by(News.published_at.desc().nullslast())

    if stock:
        query = query.join(Stock, News.stock_id == Stock.id).where(
            Stock.symbol == stock.upper()
        )
    elif sector:
        query = query.join(Stock, News.stock_id == Stock.id).where(
            Stock.sector == sector
        )

    rows = (await db.scalars(query.limit(limit))).all()

    # Resolve symbols for the returned rows in one pass.
    stock_ids = {r.stock_id for r in rows if r.stock_id}
    symbols: dict[int, str] = {}
    if stock_ids:
        for sid, sym in (
            await db.execute(
                select(Stock.id, Stock.symbol).where(Stock.id.in_(stock_ids))
            )
        ).all():
            symbols[sid] = sym

    return [
        {
            "id": r.id,
            "title": r.title,
            "url": r.url,
            "source": r.source,
            "summary": r.summary,
            "published_at": r.published_at,
            "symbol": symbols.get(r.stock_id),
        }
        for r in rows
    ]
