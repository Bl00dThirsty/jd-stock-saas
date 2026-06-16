"""Price-alert schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.alert import AlertDirection


class AlertCreate(BaseModel):
    symbol: str = Field(..., examples=["GTCO"])
    target_price: float = Field(..., gt=0)
    direction: AlertDirection


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    name: str
    target_price: float
    direction: AlertDirection
    is_active: bool
    is_triggered: bool
    created_at: datetime


class AlertToggle(BaseModel):
    is_active: bool
