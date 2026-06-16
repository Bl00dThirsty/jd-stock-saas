"""Abstract base for market-data scrapers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class Quote:
    symbol: str
    price: float
    timestamp: datetime
    open: float | None = None
    high: float | None = None
    low: float | None = None
    volume: float | None = None
    change: float | None = None
    change_percent: float | None = None


@dataclass(slots=True)
class Candle:
    timestamp: datetime
    price: float
    open: float | None = None
    high: float | None = None
    low: float | None = None
    volume: float | None = None


class BaseScraper(ABC):
    """Common interface every collector implements."""

    name: str = "base"

    @abstractmethod
    def fetch_quotes(self, symbols: list[str]) -> list[Quote]:
        """Return the latest quote for each requested NGX symbol."""

    def fetch_history(self, symbol: str, period: str, interval: str) -> list[Candle]:
        """Return historical candles. Optional — default is empty."""
        return []

    def fetch_profile(self, symbol: str) -> dict:
        """Return fundamentals/profile metadata. Optional — default is empty."""
        return {}
