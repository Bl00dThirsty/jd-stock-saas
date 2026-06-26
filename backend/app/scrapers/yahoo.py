"""Yahoo Finance scraper (yfinance) — NGX tickers use the ``.LAGOS`` suffix."""

from datetime import UTC, datetime

import yfinance as yf

from app.core.logging import get_logger
from app.scrapers.base import BaseScraper, Candle, Quote

logger = get_logger(__name__)

SUFFIX = ".LAGOS"

# yfinance period/interval presets keyed by the API's `period` query value.
HISTORY_PRESETS: dict[str, tuple[str, str]] = {
    "1d": ("1d", "5m"),
    "1w": ("5d", "30m"),
    "1m": ("1mo", "1d"),
    "1y": ("1y", "1d"),
    "max": ("max", "1wk"),
}


def to_yahoo(symbol: str) -> str:
    return symbol if symbol.endswith(SUFFIX) else f"{symbol}{SUFFIX}"


def to_ngx(ticker: str) -> str:
    return ticker.removesuffix(SUFFIX)


class YahooScraper(BaseScraper):
    name = "yahoo"

    def fetch_quotes(self, symbols: list[str]) -> list[Quote]:
        if not symbols:
            return []

        tickers = [to_yahoo(s) for s in symbols]
        data = yf.download(
            tickers=" ".join(tickers),
            period="2d",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=True,
        )

        quotes: list[Quote] = []
        now = datetime.now(UTC)
        for symbol, ticker in zip(symbols, tickers, strict=True):
            try:
                frame = data[ticker] if len(tickers) > 1 else data
                frame = frame.dropna()
                if frame.empty:
                    continue
                last = frame.iloc[-1]
                prev_close = frame.iloc[-2]["Close"] if len(frame) > 1 else last["Open"]
                price = float(last["Close"])
                change = price - float(prev_close)
                change_pct = (change / float(prev_close) * 100) if prev_close else 0.0
                quotes.append(
                    Quote(
                        symbol=symbol,
                        price=round(price, 4),
                        open=float(last["Open"]),
                        high=float(last["High"]),
                        low=float(last["Low"]),
                        volume=float(last["Volume"]),
                        change=round(change, 4),
                        change_percent=round(change_pct, 2),
                        timestamp=now,
                    )
                )
            except (KeyError, IndexError, ValueError) as exc:
                logger.debug("Could not parse Yahoo quote for %s: %s", symbol, exc)
                continue
        return quotes

    def fetch_history(self, symbol: str, period: str, interval: str) -> list[Candle]:
        """Return daily candles from Yahoo Finance.

        Returns an empty list (never raises) so callers can always iterate
        the result without an outer try/except.
        """
        try:
            yperiod, yinterval = HISTORY_PRESETS.get(period, (period, interval))
            frame = yf.download(
                tickers=to_yahoo(symbol),
                period=yperiod,
                interval=yinterval,
                auto_adjust=False,
                progress=False,
            ).dropna()

            candles: list[Candle] = []
            for ts, row in frame.iterrows():
                candles.append(
                    Candle(
                        timestamp=ts.to_pydatetime(),
                        price=float(row["Close"]),
                        open=float(row["Open"]),
                        high=float(row["High"]),
                        low=float(row["Low"]),
                        volume=float(row["Volume"]),
                    )
                )
            return candles
        except Exception as exc:  # noqa: BLE001
            logger.warning("fetch_history failed for %s (period=%s): %s", symbol, period, exc)
            return []

    def fetch_profile(self, symbol: str) -> dict:
        try:
            info = yf.Ticker(to_yahoo(symbol)).info
        except Exception as exc:  # noqa: BLE001
            logger.debug("fetch_profile failed for %s: %s", symbol, exc)
            return {}
        return {
            "logo_url": info.get("logo_url"),
            "name": info.get("longName") or info.get("shortName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "shares_outstanding": info.get("sharesOutstanding"),
            "pe_ratio": info.get("trailingPE"),
            "eps": info.get("trailingEps"),
            "dividend_yield": info.get("dividendYield"),
            "week52_high": info.get("fiftyTwoWeekHigh"),
            "week52_low": info.get("fiftyTwoWeekLow"),
        }
