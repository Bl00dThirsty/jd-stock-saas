"""Seed the ``stocks`` table with the NGX ticker universe.

Usage:
    python -m app.data.seed
"""

import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.data.tickers import NGX_TICKERS
from app.models.stock import Stock


async def seed_stocks() -> None:
    async with AsyncSessionLocal() as db:
        existing = set(
            (await db.scalars(select(Stock.symbol))).all()
        )
        created = 0
        for t in NGX_TICKERS:
            if t["symbol"] in existing:
                continue
            db.add(Stock(symbol=t["symbol"], name=t["name"], sector=t["sector"]))
            created += 1
        await db.commit()
        print(f"Seeded {created} new stocks ({len(existing)} already present).")


if __name__ == "__main__":
    asyncio.run(seed_stocks())
