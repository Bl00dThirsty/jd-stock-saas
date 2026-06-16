"""Aggregate router mounting every v1 sub-router."""

from fastapi import APIRouter

from app.api.v1 import alerts, auth, news, portfolio, stocks, ws

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(auth.users_router, prefix="/users", tags=["users"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(stocks.market_router, prefix="/market", tags=["market"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
