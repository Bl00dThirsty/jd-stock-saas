"""Price-collection Celery tasks."""

import json
from datetime import datetime, timezone

import redis as sync_redis
from sqlalchemy import select

from app.core.config import settings
from app.core.redis import price_channel
from app.core.sync_db import SyncSessionLocal
from app.models.price import PriceHistory
from app.models.stock import Stock
from app.scrapers.base import Quote
from app.scrapers.ngxpulse import NGXPulseScraper
from app.scrapers.yahoo import YahooScraper
from app.tasks.celery_app import celery_app

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
    """Fetch latest quotes, persist, denormalise onto Stock, publish to Redis."""
    yahoo = YahooScraper()
    with SyncSessionLocal() as db:
        stocks = db.scalars(select(Stock)).all()
        by_symbol = {s.symbol: s for s in stocks}
        symbols = list(by_symbol)
        if not symbols:
            return {"collected": 0, "reason": "no stocks seeded"}

        quotes = yahoo.fetch_quotes(symbols)
        if not quotes:  # fallback
            quotes = NGXPulseScraper().fetch_quotes(symbols)

        collected = 0
        for quote in quotes:
            stock = by_symbol.get(quote.symbol)
            if stock is None:
                continue
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
            except sync_redis.RedisError:
                pass
            collected += 1

        db.commit()
        return {"collected": collected, "at": datetime.now(timezone.utc).isoformat()}


@celery_app.task(name="app.tasks.prices.collect_historical")
def collect_historical(period: str = "1y", interval: str = "1d") -> dict:
    """Backfill daily candles for charting."""
    yahoo = YahooScraper()
    with SyncSessionLocal() as db:
        stocks = db.scalars(select(Stock)).all()
        total = 0
        for stock in stocks:
            candles = yahoo.fetch_history(stock.symbol, period, interval)
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
        return {"candles": total}


@celery_app.task(name="app.tasks.prices.collect_profiles")
def collect_profiles() -> dict:
    """Refresh company fundamentals/metadata daily."""
    yahoo = YahooScraper()
    with SyncSessionLocal() as db:
        stocks = db.scalars(select(Stock)).all()
        updated = 0
        for stock in stocks:
            profile = yahoo.fetch_profile(stock.symbol)
            if not profile:
                continue
            for field, value in profile.items():
                if value is not None and hasattr(stock, field):
                    setattr(stock, field, value)
            updated += 1
        db.commit()
        return {"updated": updated}
