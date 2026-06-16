"""Development-only live-price simulator.

In the demo there is no real NGX feed (yfinance can't reach `.LAGOS` offline),
so this publishes small random-walk ticks to the Redis price channels every
few seconds. The WebSocket forwards them and the UI blinks. Disabled outside
``ENVIRONMENT=development``.
"""

import asyncio
import json
import random
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.redis import price_channel, redis_client
from app.models.stock import Stock

TICK_INTERVAL = 2.5  # seconds


async def run_price_simulator(stop: asyncio.Event) -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Stock.symbol, Stock.last_price))).all()

    baseline = {sym: float(lp or 100.0) for sym, lp in rows}
    if not baseline:
        return
    price = dict(baseline)
    symbols = list(baseline)

    while not stop.is_set():
        sample = random.sample(symbols, k=max(1, len(symbols) // 3))
        for sym in sample:
            base = baseline[sym]
            drift = price[sym] * random.uniform(-0.004, 0.004)
            new = max(0.5, round(price[sym] + drift, 2))
            price[sym] = new
            change = round(new - base, 2)
            change_pct = round((change / base * 100) if base else 0.0, 2)
            message = {
                "symbol": sym,
                "price": new,
                "change": change,
                "change_percent": change_pct,
                "volume": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            try:
                await redis_client.publish(price_channel(sym), json.dumps(message))
            except Exception:  # noqa: BLE001
                pass

        try:
            await asyncio.wait_for(stop.wait(), timeout=TICK_INTERVAL)
        except asyncio.TimeoutError:
            pass
