"""Smoke tests for the public stocks listing — exercises app + DB wiring."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stock import Stock


async def test_list_stocks_empty(client: AsyncClient):
    resp = await client.get("/api/v1/stocks")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_stocks_returns_seeded(client: AsyncClient, db: AsyncSession):
    db.add(Stock(symbol="TESTCO", name="Test Company", last_price=12.5))
    await db.commit()

    resp = await client.get("/api/v1/stocks")
    assert resp.status_code == 200
    body = resp.json()
    assert any(s["symbol"] == "TESTCO" for s in body)
