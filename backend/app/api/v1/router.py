"""Aggregate router mounting every v1 sub-router."""

from fastapi import APIRouter

from app.api.v1 import admin, alerts, auth, news, portfolio, screener, sectors, stocks, watchlists, ws

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(auth.users_router, prefix="/users", tags=["users"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(stocks.market_router, prefix="/market", tags=["market"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
api_router.include_router(watchlists.router, prefix="/watchlists", tags=["watchlists"])
api_router.include_router(screener.router, prefix="/screener", tags=["screener"])
api_router.include_router(sectors.router, prefix="/sectors", tags=["sectors"])
