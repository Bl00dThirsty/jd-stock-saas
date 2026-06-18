"""Advanced stock screener with multi-filter support and CSV export."""

import csv
import io

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func as sqlfunc, select

from app.core.deps import DbSession
from app.models.stock import Stock
from app.schemas.screener import ScreenerResult
from app.schemas.stock import StockRow

router = APIRouter()

_SORT_COLS = {
    "symbol": Stock.symbol,
    "last_price": Stock.last_price,
    "change_percent": Stock.change_percent,
    "volume": Stock.volume,
    "market_cap": Stock.market_cap,
    "pe_ratio": Stock.pe_ratio,
    "dividend_yield": Stock.dividend_yield,
}


def _build_query(
    sector: str | None,
    pe_min: float | None,
    pe_max: float | None,
    cap_min: float | None,
    cap_max: float | None,
    vol_min: float | None,
    div_yield_min: float | None,
    change_pct_min: float | None,
    change_pct_max: float | None,
    week52_pct_from_high: float | None,
):
    q = select(Stock)
    if sector:
        q = q.where(Stock.sector == sector)
    if pe_min is not None:
        q = q.where(Stock.pe_ratio != None, Stock.pe_ratio >= pe_min)  # noqa: E711
    if pe_max is not None:
        q = q.where(Stock.pe_ratio != None, Stock.pe_ratio <= pe_max)  # noqa: E711
    if cap_min is not None:
        q = q.where(Stock.market_cap != None, Stock.market_cap >= cap_min)  # noqa: E711
    if cap_max is not None:
        q = q.where(Stock.market_cap != None, Stock.market_cap <= cap_max)  # noqa: E711
    if vol_min is not None:
        q = q.where(Stock.volume != None, Stock.volume >= vol_min)  # noqa: E711
    if div_yield_min is not None:
        q = q.where(Stock.dividend_yield != None, Stock.dividend_yield >= div_yield_min)  # noqa: E711
    if change_pct_min is not None:
        q = q.where(Stock.change_percent != None, Stock.change_percent >= change_pct_min)  # noqa: E711
    if change_pct_max is not None:
        q = q.where(Stock.change_percent != None, Stock.change_percent <= change_pct_max)  # noqa: E711
    if week52_pct_from_high is not None:
        # Price within `week52_pct_from_high`% below its 52-week high
        # last_price >= week52_high * (1 - week52_pct_from_high/100)
        q = q.where(
            Stock.week52_high != None,  # noqa: E711
            Stock.last_price != None,  # noqa: E711
            Stock.last_price >= Stock.week52_high * (1 - week52_pct_from_high / 100),
        )
    return q


@router.get("", response_model=ScreenerResult)
async def screen(
    db: DbSession,
    sector: str | None = None,
    pe_min: float | None = None,
    pe_max: float | None = None,
    cap_min: float | None = None,
    cap_max: float | None = None,
    vol_min: float | None = None,
    div_yield_min: float | None = None,
    change_pct_min: float | None = None,
    change_pct_max: float | None = None,
    week52_pct_from_high: float | None = None,
    sort_by: str = Query("market_cap", pattern="^(symbol|last_price|change_percent|volume|market_cap|pe_ratio|dividend_yield)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
) -> ScreenerResult:
    base_q = _build_query(sector, pe_min, pe_max, cap_min, cap_max, vol_min, div_yield_min, change_pct_min, change_pct_max, week52_pct_from_high)

    total = await db.scalar(select(sqlfunc.count()).select_from(base_q.subquery())) or 0

    col = _SORT_COLS.get(sort_by, Stock.market_cap)
    order = col.asc() if sort_dir == "asc" else col.desc().nulls_last()
    stocks = list((await db.scalars(base_q.order_by(order).limit(limit).offset(offset))).all())

    return ScreenerResult(total=total, stocks=[StockRow.model_validate(s) for s in stocks])


@router.get("/export/csv")
async def export_csv(
    db: DbSession,
    sector: str | None = None,
    pe_min: float | None = None,
    pe_max: float | None = None,
    cap_min: float | None = None,
    cap_max: float | None = None,
    vol_min: float | None = None,
    div_yield_min: float | None = None,
    change_pct_min: float | None = None,
    change_pct_max: float | None = None,
    week52_pct_from_high: float | None = None,
    sort_by: str = Query("market_cap"),
    sort_dir: str = Query("desc"),
) -> StreamingResponse:
    base_q = _build_query(sector, pe_min, pe_max, cap_min, cap_max, vol_min, div_yield_min, change_pct_min, change_pct_max, week52_pct_from_high)
    col = _SORT_COLS.get(sort_by, Stock.market_cap)
    order = col.asc() if sort_dir == "asc" else col.desc().nulls_last()
    stocks = list((await db.scalars(base_q.order_by(order).limit(2000))).all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Symbol", "Name", "Sector", "Price (NGN)", "Change %", "Volume", "Market Cap", "P/E", "Div Yield %", "52W High", "52W Low"])
    for s in stocks:
        writer.writerow([
            s.symbol, s.name, s.sector or "",
            s.last_price or "", s.change_percent or "",
            s.volume or "", s.market_cap or "",
            s.pe_ratio or "", s.dividend_yield or "",
            s.week52_high or "", s.week52_low or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ngx_screener.csv"},
    )
