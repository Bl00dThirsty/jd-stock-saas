"""Shared async Redis client (cache + pub/sub for the price WebSocket)."""

from redis import asyncio as aioredis

from app.core.config import settings

PRICE_CHANNEL_PREFIX = "prices"

redis_client: aioredis.Redis = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)


def price_channel(symbol: str) -> str:
    """Redis pub/sub channel name for a given ticker symbol."""
    return f"{PRICE_CHANNEL_PREFIX}:{symbol.upper()}"
