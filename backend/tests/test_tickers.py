"""Ticker universe + Yahoo symbol mapping."""

from app.data.tickers import NGX_SYMBOLS, NGX_TICKERS, yahoo_tickers
from app.scrapers.yahoo import to_ngx, to_yahoo


def test_ticker_universe_is_unique_and_nonempty():
    assert len(NGX_TICKERS) > 0
    assert len(NGX_SYMBOLS) == len(set(NGX_SYMBOLS)), "duplicate symbols present"


def test_every_ticker_has_required_fields():
    for t in NGX_TICKERS:
        assert t["symbol"] and t["name"] and t["sector"]


def test_yahoo_suffix_mapping():
    assert to_yahoo("DANGCEM") == "DANGCEM.LAGOS"
    # Idempotent — already-suffixed symbols are left alone.
    assert to_yahoo("DANGCEM.LAGOS") == "DANGCEM.LAGOS"
    assert to_ngx("GTCO.LAGOS") == "GTCO"


def test_yahoo_tickers_all_suffixed():
    assert all(t.endswith(".LAGOS") for t in yahoo_tickers())
