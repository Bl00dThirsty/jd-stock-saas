"""NGXPulse API client — fallback quotes + company profiles (20-min refresh)."""

from datetime import UTC, datetime

import httpx

from app.core.config import settings
from app.scrapers.base import BaseScraper, Quote


def _to_float(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class NGXPulseScraper(BaseScraper):
    name = "ngxpulse"

    def __init__(self) -> None:
        self.base_url = settings.NGXPULSE_BASE_URL
        self.api_key = settings.NGXPULSE_API_KEY

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key} if self.api_key else {}

    def _fetch_all(self) -> list[dict]:
        resp = httpx.get(f"{self.base_url}/stocks", headers=self._headers(), timeout=20.0)
        resp.raise_for_status()
        payload = resp.json()
        # The API may wrap rows under a "data" key.
        return payload.get("data", payload) if isinstance(payload, dict) else payload

    def fetch_quotes(self, symbols: list[str]) -> list[Quote]:
        wanted = {s.upper() for s in symbols} if symbols else None
        try:
            rows = self._fetch_all()
        except (httpx.HTTPError, ValueError):
            return []

        now = datetime.now(UTC)
        quotes: list[Quote] = []
        for row in rows:
            symbol = str(row.get("symbol", "")).upper()
            if not symbol or (wanted and symbol not in wanted):
                continue
            price = _to_float(row.get("price") or row.get("close"))
            if price is None:
                continue
            quotes.append(
                Quote(
                    symbol=symbol,
                    price=price,
                    volume=_to_float(row.get("volume")),
                    change=_to_float(row.get("change")),
                    change_percent=_to_float(row.get("change_percent") or row.get("pchange")),
                    timestamp=now,
                )
            )
        return quotes

    def fetch_profile(self, symbol: str) -> dict:
        try:
            rows = self._fetch_all()
        except (httpx.HTTPError, ValueError):
            return {}
        for row in rows:
            if str(row.get("symbol", "")).upper() == symbol.upper():
                return {
                    "sector": row.get("sector"),
                    "market_cap": _to_float(row.get("market_cap")),
                    "pe_ratio": _to_float(row.get("pe") or row.get("pe_ratio")),
                }
        return {}
