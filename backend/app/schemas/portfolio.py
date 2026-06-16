"""Portfolio schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HoldingCreate(BaseModel):
    symbol: str = Field(..., examples=["DANGCEM"])
    shares: float = Field(..., gt=0)
    avg_price: float = Field(..., gt=0)


class HoldingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    name: str
    shares: float
    avg_price: float
    last_price: float | None = None
    market_value: float | None = None
    cost_basis: float
    gain_loss: float | None = None
    gain_loss_percent: float | None = None


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class PortfolioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    holdings: list[HoldingOut] = []
    total_value: float = 0.0
    total_cost: float = 0.0
    total_gain_loss: float = 0.0
