"""Screener response schemas."""

from pydantic import BaseModel

from app.schemas.stock import StockRow


class ScreenerResult(BaseModel):
    total: int
    stocks: list[StockRow]
