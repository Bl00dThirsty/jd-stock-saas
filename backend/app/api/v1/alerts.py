"""Price-alert endpoints (scoped to the current user)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.deps import CurrentUser, DbSession
from app.models.alert import PriceAlert
from app.models.stock import Stock
from app.schemas.alert import AlertCreate, AlertOut, AlertToggle

router = APIRouter()


def _serialize(alert: PriceAlert) -> dict:
    return {
        "id": alert.id,
        "symbol": alert.stock.symbol,
        "name": alert.stock.name,
        "target_price": alert.target_price,
        "direction": alert.direction,
        "is_active": alert.is_active,
        "is_triggered": alert.is_triggered,
        "created_at": alert.created_at,
    }


async def _owned_alert(db: DbSession, user_id, alert_id: int) -> PriceAlert:
    alert = await db.scalar(
        select(PriceAlert)
        .options(joinedload(PriceAlert.stock))
        .where(PriceAlert.id == alert_id, PriceAlert.user_id == user_id)
    )
    if alert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found")
    return alert


@router.get("", response_model=list[AlertOut])
async def list_alerts(db: DbSession, user: CurrentUser) -> list[dict]:
    alerts = (
        await db.scalars(
            select(PriceAlert)
            .options(joinedload(PriceAlert.stock))
            .where(PriceAlert.user_id == user.id)
            .order_by(PriceAlert.created_at.desc())
        )
    ).all()
    return [_serialize(a) for a in alerts]


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(body: AlertCreate, db: DbSession, user: CurrentUser) -> dict:
    stock = await db.scalar(select(Stock).where(Stock.symbol == body.symbol.upper()))
    if stock is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown symbol '{body.symbol}'")

    alert = PriceAlert(
        user_id=user.id,
        stock_id=stock.id,
        target_price=body.target_price,
        direction=body.direction,
    )
    db.add(alert)
    await db.flush()
    alert.stock = stock
    return _serialize(alert)


@router.patch("/{alert_id}", response_model=AlertOut)
async def toggle_alert(
    alert_id: int, body: AlertToggle, db: DbSession, user: CurrentUser
) -> dict:
    alert = await _owned_alert(db, user.id, alert_id)
    alert.is_active = body.is_active
    if body.is_active:
        alert.is_triggered = False
    await db.flush()
    return _serialize(alert)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(alert_id: int, db: DbSession, user: CurrentUser) -> None:
    alert = await _owned_alert(db, user.id, alert_id)
    await db.delete(alert)
