"""Price-collection Celery tasks.

Resilience contract (Guide §4.3 — state flag pattern):
  - Each per-stock iteration is wrapped in try/except.
  - Failures increment a `failed` counter but never abort the loop.
  - The task return value always includes both `collected` and `failed` counts
    so monitoring can detect partial failures without parsing log lines.
"""

import json
from datetime import datetime, timezone

import redis as sync_redis
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import price_channel
from app.core.sync_db import SyncSessionLocal
from app.models.price import PriceHistory
from app.models.stock import Stock
from app.scrapers.base import Quote
from app.scrapers.ngxpulse import NGXPulseScraper
from app.scrapers.yahoo import YahooScraper
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)

_redis = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)


def _publish_quote(stock: Stock, quote: Quote) -> None:
    message = {
        "symbol": stock.symbol,
        "price": quote.price,
        "change": quote.change,
        "change_percent": quote.change_percent,
        "volume": quote.volume,
        "timestamp": quote.timestamp.isoformat(),
    }
    _redis.publish(price_channel(stock.symbol), json.dumps(message))


@celery_app.task(name="app.tasks.prices.collect_prices")
def collect_prices() -> dict:
    """Fetch latest quotes, persist to DB, denormalise onto Stock, publish to Redis.

    Falls back to NGXPulse if Yahoo returns nothing.
    Each symbol is processed independently — one failure never blocks the others.
    """
    yahoo = YahooScraper()
    with SyncSessionLocal() as db:
        stocks = db.scalars(select(Stock)).all()
        by_symbol = {s.symbol: s for s in stocks}
        symbols = list(by_symbol)
        if not symbols:
            logger.warning("collect_prices: no stocks seeded, skipping")
            return {"collected": 0, "failed": 0, "reason": "no stocks seeded"}

        # ── Fetch quotes (Yahoo → NGXPulse fallback) ──────────────────────────
        quotes: list[Quote] = []
        try:
            quotes = yahoo.fetch_quotes(symbols)
            logger.debug("Yahoo returned %d quotes", len(quotes))
        except Exception as exc:
            logger.error("Yahoo fetch_quotes failed, trying NGXPulse: %s", exc)

        if not quotes:
            try:
                quotes = NGXPulseScraper().fetch_quotes(symbols)
                logger.debug("NGXPulse returned %d quotes", len(quotes))
            except Exception as exc:
                logger.error("NGXPulse fallback also failed: %s", exc)
                return {"collected": 0, "failed": len(symbols), "error": str(exc)}

        # ── Persist — one try/except per symbol (state flag pattern) ──────────
        collected = 0
        failed = 0

        for quote in quotes:
            stock = by_symbol.get(quote.symbol)
            if stock is None:
                continue
            try:
                db.add(
                    PriceHistory(
                        stock_id=stock.id,
                        price=quote.price,
                        open=quote.open,
                        high=quote.high,
                        low=quote.low,
                        volume=quote.volume,
                        change=quote.change,
                        change_percent=quote.change_percent,
                        timestamp=quote.timestamp,
                    )
                )
                stock.last_price = quote.price
                stock.change = quote.change
                stock.change_percent = quote.change_percent
                stock.volume = quote.volume

                try:
                    _publish_quote(stock, quote)
                except sync_redis.RedisError as exc:
                    logger.warning("Redis publish failed for %s: %s", quote.symbol, exc)

                collected += 1
            except Exception as exc:
                logger.error("Failed to persist quote for %s: %s", quote.symbol, exc)
                failed += 1

        db.commit()

        if failed:
            logger.warning("collect_prices: %d OK / %d failed", collected, failed)
        else:
            logger.info("collect_prices: %d quotes collected", collected)

        return {
            "collected": collected,
            "failed": failed,
            "at": datetime.now(timezone.utc).isoformat(),
        }


@celery_app.task(name="app.tasks.prices.collect_historical")
def collect_historical(period: str = "1y", interval: str = "1d") -> dict:
    """Backfill daily candles for charting.

    Each stock is committed individually so a network error on stock N does not
    roll back the candles already saved for stocks 0..N-1.
    """
    yahoo = YahooScraper()
    with SyncSessionLocal() as db:
        stocks = db.scalars(select(Stock)).all()
        total = 0
        failed = 0

        for stock in stocks:
            try:
                candles = yahoo.fetch_history(stock.symbol, period, interval)
                if not candles:
                    logger.debug("No historical candles for %s (period=%s)", stock.symbol, period)
                    continue
                for c in candles:
                    db.add(
                        PriceHistory(
                            stock_id=stock.id,
                            price=c.price,
                            open=c.open,
                            high=c.high,
                            low=c.low,
                            volume=c.volume,
                            timestamp=c.timestamp,
                        )
                    )
                    total += 1
                db.commit()
                logger.debug("collect_historical: %s — %d candles saved", stock.symbol, len(candles))
            except Exception as exc:
                logger.error("Historical fetch failed for %s: %s", stock.symbol, exc)
                db.rollback()
                failed += 1

        if failed:
            logger.warning("collect_historical: %d candles saved, %d stocks failed", total, failed)
        else:
            logger.info("collect_historical: %d candles saved across %d stocks", total, len(stocks))

        return {"candles": total, "failed": failed}


@celery_app.task(name="app.tasks.prices.collect_profiles")
def collect_profiles() -> dict:
    """Refresh company fundamentals/metadata daily.

    Each stock is updated independently — a 404 from Yahoo for one ticker
    does not abort the rest.
    """
    yahoo = YahooScraper()
    with SyncSessionLocal() as db:
        stocks = db.scalars(select(Stock)).all()
        updated = 0
        failed = 0

        for stock in stocks:
            try:
                profile = yahoo.fetch_profile(stock.symbol)
                if not profile:
                    logger.debug("No profile data for %s", stock.symbol)
                    continue
                for field, value in profile.items():
                    if value is not None and hasattr(stock, field):
                        setattr(stock, field, value)
                updated += 1
            except Exception as exc:
                logger.error("Profile fetch failed for %s: %s", stock.symbol, exc)
                failed += 1

        db.commit()

        if failed:
            logger.warning("collect_profiles: %d updated, %d failed", updated, failed)
        else:
            logger.info("collect_profiles: %d profiles refreshed", updated)

        return {"updated": updated, "failed": failed}
