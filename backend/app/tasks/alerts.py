"""Price-alert evaluation task — fires when a stock crosses its target."""

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.logging import get_logger
from app.core.sync_db import SyncSessionLocal
from app.models.alert import AlertDirection, PriceAlert
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="app.tasks.alerts.check_alerts")
def check_alerts() -> dict:
    """Mark active alerts as triggered when the live price crosses the target."""
    with SyncSessionLocal() as db:
        alerts = db.scalars(
            select(PriceAlert)
            .options(joinedload(PriceAlert.stock))
            .where(PriceAlert.is_active.is_(True), PriceAlert.is_triggered.is_(False))
        ).all()

        triggered = 0
        for alert in alerts:
            price = alert.stock.last_price
            if price is None:
                continue
            crossed = (alert.direction == AlertDirection.above and price >= alert.target_price) or (
                alert.direction == AlertDirection.below and price <= alert.target_price
            )
            if crossed:
                alert.is_triggered = True
                triggered += 1

        db.commit()
        if triggered:
            logger.info("check_alerts: %d triggered out of %d checked", triggered, len(alerts))
        else:
            logger.debug("check_alerts: 0 triggered, %d checked", len(alerts))
        return {"triggered": triggered, "checked": len(alerts)}
