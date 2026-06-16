"""WebSocket endpoint streaming live prices from Redis pub/sub."""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.redis import PRICE_CHANNEL_PREFIX, redis_client

router = APIRouter()


@router.websocket("/prices")
async def stream_prices(websocket: WebSocket) -> None:
    """Forward every ``prices:*`` message published by the Celery collectors.

    Clients may optionally send a JSON message ``{"symbols": ["DANGCEM", ...]}``
    to filter the stream; an empty / absent list means "all symbols".
    """
    await websocket.accept()
    pubsub = redis_client.pubsub()
    await pubsub.psubscribe(f"{PRICE_CHANNEL_PREFIX}:*")

    symbol_filter: set[str] = set()

    async def listen_client() -> None:
        nonlocal symbol_filter
        try:
            while True:
                raw = await websocket.receive_text()
                payload = json.loads(raw)
                symbol_filter = {s.upper() for s in payload.get("symbols", [])}
        except (WebSocketDisconnect, json.JSONDecodeError):
            return

    client_task = asyncio.create_task(listen_client())
    try:
        async for message in pubsub.listen():
            if message.get("type") != "pmessage":
                continue
            data = json.loads(message["data"])
            if symbol_filter and data.get("symbol", "").upper() not in symbol_filter:
                continue
            await websocket.send_json(data)
    except WebSocketDisconnect:
        pass
    finally:
        client_task.cancel()
        await pubsub.punsubscribe(f"{PRICE_CHANNEL_PREFIX}:*")
        await pubsub.aclose()
