"""Portfolio & holdings endpoints (scoped to the current user)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.portfolio import Portfolio, PortfolioHolding
from app.models.stock import Stock
from app.schemas.portfolio import HoldingCreate, PortfolioCreate, PortfolioOut
from app.services.portfolio_service import serialize_portfolio

router = APIRouter()

_LOAD = selectinload(Portfolio.holdings).selectinload(PortfolioHolding.stock)


async def _owned_portfolio(db: DbSession, user_id, portfolio_id: int) -> Portfolio:
    portfolio = await db.scalar(
        select(Portfolio)
        .options(_LOAD)
        .where(Portfolio.id == portfolio_id, Portfolio.user_id == user_id)
    )
    if portfolio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Portfolio not found")
    return portfolio


@router.get("", response_model=list[PortfolioOut])
async def list_portfolios(db: DbSession, user: CurrentUser) -> list[dict]:
    portfolios = (
        await db.scalars(
            select(Portfolio).options(_LOAD).where(Portfolio.user_id == user.id)
        )
    ).all()
    return [serialize_portfolio(p) for p in portfolios]


@router.post("", response_model=PortfolioOut, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    body: PortfolioCreate, db: DbSession, user: CurrentUser
) -> dict:
    portfolio = Portfolio(name=body.name, user_id=user.id)
    db.add(portfolio)
    await db.flush()
    await db.refresh(portfolio, attribute_names=["holdings"])
    return serialize_portfolio(portfolio)


@router.post(
    "/{portfolio_id}/holdings",
    response_model=PortfolioOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_holding(
    portfolio_id: int, body: HoldingCreate, db: DbSession, user: CurrentUser
) -> dict:
    portfolio = await _owned_portfolio(db, user.id, portfolio_id)
    stock = await db.scalar(select(Stock).where(Stock.symbol == body.symbol.upper()))
    if stock is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown symbol '{body.symbol}'")

    db.add(
        PortfolioHolding(
            portfolio_id=portfolio.id,
            stock_id=stock.id,
            shares=body.shares,
            avg_price=body.avg_price,
        )
    )
    await db.flush()
    refreshed = await _owned_portfolio(db, user.id, portfolio_id)
    return serialize_portfolio(refreshed)


@router.delete(
    "/{portfolio_id}/holdings/{holding_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_holding(
    portfolio_id: int, holding_id: int, db: DbSession, user: CurrentUser
) -> None:
    await _owned_portfolio(db, user.id, portfolio_id)  # ownership check
    holding = await db.scalar(
        select(PortfolioHolding).where(
            PortfolioHolding.id == holding_id,
            PortfolioHolding.portfolio_id == portfolio_id,
        )
    )
    if holding is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Holding not found")
    await db.delete(holding)


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(
    portfolio_id: int, db: DbSession, user: CurrentUser
) -> None:
    portfolio = await _owned_portfolio(db, user.id, portfolio_id)
    await db.delete(portfolio)
