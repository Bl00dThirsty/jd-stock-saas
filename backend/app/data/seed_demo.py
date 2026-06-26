"""Seed plausible demo market data so the UI looks alive without yfinance.

Generates a 90-day daily random-walk per stock and denormalises the latest
quote onto each Stock row. Re-runnable: it wipes existing price history first.

Usage:
    python -m app.data.seed_demo
"""

import asyncio
import hashlib
import random
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select

from app.core.database import AsyncSessionLocal
from app.models.price import PriceHistory
from app.models.stock import Stock

DAYS = 90


def _base_price(symbol: str) -> float:
    """Deterministic-ish starting price per symbol (₦5 – ₦600)."""
    h = int(hashlib.md5(symbol.encode()).hexdigest(), 16)
    return round(5 + (h % 59500) / 100, 2)


async def seed_demo() -> None:
    async with AsyncSessionLocal() as db:
        stocks = (await db.scalars(select(Stock))).all()
        if not stocks:
            print("No stocks seeded yet — run `python -m app.data.seed` first.")
            return

        await db.execute(delete(PriceHistory))

        now = datetime.now(UTC)
        total_points = 0

        for stock in stocks:
            rng = random.Random(stock.symbol)  # reproducible per symbol
            price = _base_price(stock.symbol)
            prev_close = price

            for day in range(DAYS, 0, -1):
                ts = now - timedelta(days=day)
                drift = rng.uniform(-0.035, 0.037)  # slight upward bias
                open_ = round(price, 2)
                price = max(0.5, round(price * (1 + drift), 2))
                high = round(max(open_, price) * (1 + rng.uniform(0, 0.02)), 2)
                low = round(min(open_, price) * (1 - rng.uniform(0, 0.02)), 2)
                volume = float(rng.randint(50_000, 5_000_000))
                change = round(price - prev_close, 2)
                change_pct = round((change / prev_close * 100) if prev_close else 0, 2)
                prev_close = price

                db.add(
                    PriceHistory(
                        stock_id=stock.id,
                        price=price,
                        open=open_,
                        high=high,
                        low=low,
                        volume=volume,
                        change=change,
                        change_percent=change_pct,
                        timestamp=ts,
                    )
                )
                total_points += 1

            # Denormalise the latest quote + plausible fundamentals.
            stock.last_price = price
            stock.change = change
            stock.change_percent = change_pct
            stock.volume = volume
            stock.market_cap = round(price * rng.randint(500_000_000, 5_000_000_000))
            stock.shares_outstanding = float(rng.randint(500_000_000, 5_000_000_000))
            stock.pe_ratio = round(rng.uniform(4, 35), 2)
            stock.eps = round(price / max(stock.pe_ratio, 1), 2)
            stock.dividend_yield = round(rng.uniform(0, 8), 2)
            stock.week52_high = round(price * rng.uniform(1.05, 1.6), 2)
            stock.week52_low = round(price * rng.uniform(0.4, 0.95), 2)

        await db.commit()
        print(f"Seeded demo data: {total_points} price points across {len(stocks)} stocks.")


if __name__ == "__main__":
    asyncio.run(seed_demo())
