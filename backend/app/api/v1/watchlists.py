"""Watchlist endpoints — multiple named watchlists per authenticated user."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func as sqlfunc
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.stock import Stock
from app.models.watchlist import Watchlist, WatchlistItem
from app.schemas.watchlist import (
    WatchlistCreate,
    WatchlistOut,
    WatchlistSummary,
    WatchlistUpdate,
)

router = APIRouter()

MAX_WATCHLISTS = 10
MAX_ITEMS = 200


async def _own_watchlist(db: DbSession, wid: int, user_id) -> Watchlist:
    wl = await db.scalar(
        select(Watchlist)
        .options(selectinload(Watchlist.items).selectinload(WatchlistItem.stock))
        .where(Watchlist.id == wid, Watchlist.user_id == user_id)
    )
    if wl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist not found")
    return wl


@router.get("", response_model=list[WatchlistSummary])
async def list_watchlists(db: DbSession, user: CurrentUser) -> list:
    watchlists = list(
        (
            await db.scalars(
                select(Watchlist)
                .where(Watchlist.user_id == user.id)
                .order_by(Watchlist.is_default.desc(), Watchlist.created_at.asc())
            )
        ).all()
    )
    if not watchlists:
        return []
    counts = dict(
        (
            await db.execute(
                select(WatchlistItem.watchlist_id, sqlfunc.count().label("n"))
                .where(WatchlistItem.watchlist_id.in_([w.id for w in watchlists]))
                .group_by(WatchlistItem.watchlist_id)
            )
        ).all()
    )
    result = []
    for wl in watchlists:
        result.append(
            WatchlistSummary(
                id=wl.id,
                name=wl.name,
                is_default=wl.is_default,
                created_at=wl.created_at,
                item_count=counts.get(wl.id, 0),
            )
        )
    return result


@router.post("", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED)
async def create_watchlist(body: WatchlistCreate, db: DbSession, user: CurrentUser) -> Watchlist:
    count = (
        await db.scalar(
            select(sqlfunc.count()).select_from(Watchlist).where(Watchlist.user_id == user.id)
        )
        or 0
    )
    if count >= MAX_WATCHLISTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_WATCHLISTS} watchlists per account",
        )
    wl = Watchlist(user_id=user.id, name=body.name, is_default=(count == 0))
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return wl


@router.get("/default", response_model=WatchlistOut)
async def get_default_watchlist(db: DbSession, user: CurrentUser) -> Watchlist:
    wl = await db.scalar(
        select(Watchlist)
        .options(selectinload(Watchlist.items).selectinload(WatchlistItem.stock))
        .where(Watchlist.user_id == user.id, Watchlist.is_default == True)  # noqa: E712
    )
    if wl is None:
        # Auto-create the default watchlist on first access
        wl = Watchlist(user_id=user.id, name="Watchlist", is_default=True)
        db.add(wl)
        await db.commit()
        await db.refresh(wl)
    return wl


@router.get("/{wid}", response_model=WatchlistOut)
async def get_watchlist(wid: int, db: DbSession, user: CurrentUser) -> Watchlist:
    return await _own_watchlist(db, wid, user.id)


@router.patch("/{wid}", response_model=WatchlistSummary)
async def rename_watchlist(
    wid: int, body: WatchlistUpdate, db: DbSession, user: CurrentUser
) -> WatchlistSummary:
    wl = await _own_watchlist(db, wid, user.id)
    wl.name = body.name
    await db.commit()
    count = (
        await db.scalar(
            select(sqlfunc.count())
            .select_from(WatchlistItem)
            .where(WatchlistItem.watchlist_id == wid)
        )
        or 0
    )
    return WatchlistSummary(
        id=wl.id, name=wl.name, is_default=wl.is_default, created_at=wl.created_at, item_count=count
    )


@router.delete("/{wid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist(wid: int, db: DbSession, user: CurrentUser) -> None:
    wl = await _own_watchlist(db, wid, user.id)
    if wl.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the default watchlist. Rename it instead.",
        )
    await db.delete(wl)
    await db.commit()


@router.post(
    "/{wid}/items/{symbol}", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED
)
async def add_item(wid: int, symbol: str, db: DbSession, user: CurrentUser) -> Watchlist:
    wl = await _own_watchlist(db, wid, user.id)
    if len(wl.items) >= MAX_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Watchlist full ({MAX_ITEMS} items)"
        )
    stock = await db.scalar(select(Stock).where(Stock.symbol == symbol.upper()))
    if stock is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown symbol '{symbol}'"
        )
    already = any(i.stock_id == stock.id for i in wl.items)
    if not already:
        db.add(WatchlistItem(watchlist_id=wid, stock_id=stock.id))
        await db.commit()
    return await _own_watchlist(db, wid, user.id)


@router.delete("/{wid}/items/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(wid: int, symbol: str, db: DbSession, user: CurrentUser) -> None:
    wl = await _own_watchlist(db, wid, user.id)
    stock = await db.scalar(select(Stock).where(Stock.symbol == symbol.upper()))
    if stock is None:
        return
    item = next((i for i in wl.items if i.stock_id == stock.id), None)
    if item:
        await db.delete(item)
        await db.commit()
