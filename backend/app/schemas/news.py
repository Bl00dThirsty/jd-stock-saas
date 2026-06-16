"""News schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NewsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    url: str
    source: str | None = None
    summary: str | None = None
    published_at: datetime | None = None
    symbol: str | None = None
