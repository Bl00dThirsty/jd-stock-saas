"""NGX (Nigerian Exchange) ticker universe seed.

A curated subset of liquid NGX-listed equities. The Yahoo Finance ticker for
each is ``<symbol>.LAGOS``. Extend this list toward the full ~146 names as
needed — the collectors and seed script are list-driven.
"""

from typing import TypedDict


class TickerSeed(TypedDict):
    symbol: str
    name: str
    sector: str


NGX_TICKERS: list[TickerSeed] = [
    # ─── Banking ───
    {"symbol": "ZENITHBANK", "name": "Zenith Bank Plc", "sector": "Banking"},
    {"symbol": "GTCO", "name": "Guaranty Trust Holding Co Plc", "sector": "Banking"},
    {"symbol": "ACCESSCORP", "name": "Access Holdings Plc", "sector": "Banking"},
    {"symbol": "UBA", "name": "United Bank for Africa Plc", "sector": "Banking"},
    {"symbol": "FBNH", "name": "FBN Holdings Plc", "sector": "Banking"},
    {"symbol": "FIDELITYBK", "name": "Fidelity Bank Plc", "sector": "Banking"},
    {"symbol": "STANBIC", "name": "Stanbic IBTC Holdings Plc", "sector": "Banking"},
    {"symbol": "STERLINGNG", "name": "Sterling Financial Holdings Co", "sector": "Banking"},
    {"symbol": "WEMABANK", "name": "Wema Bank Plc", "sector": "Banking"},
    {"symbol": "ETI", "name": "Ecobank Transnational Inc", "sector": "Banking"},
    {"symbol": "JAIZBANK", "name": "Jaiz Bank Plc", "sector": "Banking"},
    {"symbol": "UNITYBNK", "name": "Unity Bank Plc", "sector": "Banking"},
    # ─── Industrial / Cement ───
    {"symbol": "DANGCEM", "name": "Dangote Cement Plc", "sector": "Industrial Goods"},
    {"symbol": "BUACEMENT", "name": "BUA Cement Plc", "sector": "Industrial Goods"},
    {"symbol": "WAPCO", "name": "Lafarge Africa Plc", "sector": "Industrial Goods"},
    {"symbol": "CUTIX", "name": "Cutix Plc", "sector": "Industrial Goods"},
    # ─── Telecom ───
    {"symbol": "MTNN", "name": "MTN Nigeria Communications Plc", "sector": "Telecoms"},
    {"symbol": "AIRTELAFRI", "name": "Airtel Africa Plc", "sector": "Telecoms"},
    # ─── Consumer Goods ───
    {"symbol": "NESTLE", "name": "Nestle Nigeria Plc", "sector": "Consumer Goods"},
    {"symbol": "NB", "name": "Nigerian Breweries Plc", "sector": "Consumer Goods"},
    {"symbol": "DANGSUGAR", "name": "Dangote Sugar Refinery Plc", "sector": "Consumer Goods"},
    {"symbol": "FLOURMILL", "name": "Flour Mills of Nigeria Plc", "sector": "Consumer Goods"},
    {"symbol": "UNILEVER", "name": "Unilever Nigeria Plc", "sector": "Consumer Goods"},
    {"symbol": "CADBURY", "name": "Cadbury Nigeria Plc", "sector": "Consumer Goods"},
    {"symbol": "GUINNESS", "name": "Guinness Nigeria Plc", "sector": "Consumer Goods"},
    {"symbol": "INTBREW", "name": "International Breweries Plc", "sector": "Consumer Goods"},
    {"symbol": "NASCON", "name": "NASCON Allied Industries Plc", "sector": "Consumer Goods"},
    {"symbol": "HONYFLOUR", "name": "Honeywell Flour Mills Plc", "sector": "Consumer Goods"},
    {"symbol": "PZ", "name": "PZ Cussons Nigeria Plc", "sector": "Consumer Goods"},
    {"symbol": "VITAFOAM", "name": "Vitafoam Nigeria Plc", "sector": "Consumer Goods"},
    # ─── Oil & Gas ───
    {"symbol": "SEPLAT", "name": "Seplat Energy Plc", "sector": "Oil & Gas"},
    {"symbol": "OANDO", "name": "Oando Plc", "sector": "Oil & Gas"},
    {"symbol": "TOTAL", "name": "TotalEnergies Marketing Nigeria", "sector": "Oil & Gas"},
    {"symbol": "CONOIL", "name": "Conoil Plc", "sector": "Oil & Gas"},
    {"symbol": "ETERNA", "name": "Eterna Plc", "sector": "Oil & Gas"},
    {"symbol": "ARDOVA", "name": "Ardova Plc", "sector": "Oil & Gas"},
    # ─── Agriculture ───
    {"symbol": "OKOMUOIL", "name": "Okomu Oil Palm Plc", "sector": "Agriculture"},
    {"symbol": "PRESCO", "name": "Presco Plc", "sector": "Agriculture"},
    {"symbol": "LIVESTOCK", "name": "Livestock Feeds Plc", "sector": "Agriculture"},
    # ─── Insurance ───
    {"symbol": "AIICO", "name": "AIICO Insurance Plc", "sector": "Insurance"},
    {"symbol": "MANSARD", "name": "AXA Mansard Insurance Plc", "sector": "Insurance"},
    {"symbol": "CORNERST", "name": "Cornerstone Insurance Plc", "sector": "Insurance"},
    {"symbol": "NEM", "name": "NEM Insurance Plc", "sector": "Insurance"},
    # ─── Industrial / Conglomerates ───
    {"symbol": "TRANSCORP", "name": "Transnational Corporation Plc", "sector": "Conglomerates"},
    {"symbol": "UACN", "name": "UAC of Nigeria Plc", "sector": "Conglomerates"},
    {"symbol": "BUAFOODS", "name": "BUA Foods Plc", "sector": "Consumer Goods"},
    # ─── Healthcare ───
    {"symbol": "FIDSON", "name": "Fidson Healthcare Plc", "sector": "Healthcare"},
    {"symbol": "MAYBAKER", "name": "May & Baker Nigeria Plc", "sector": "Healthcare"},
    # ─── ICT / Services ───
    {"symbol": "CWG", "name": "CWG Plc", "sector": "ICT"},
    {"symbol": "CHAMS", "name": "Chams Holding Co Plc", "sector": "ICT"},
    {"symbol": "TRANSPOWER", "name": "Transcorp Power Plc", "sector": "Utilities"},
]


NGX_SYMBOLS: list[str] = [t["symbol"] for t in NGX_TICKERS]


def yahoo_tickers() -> list[str]:
    """Return the Yahoo Finance tickers (``.LAGOS`` suffix)."""
    return [f"{s}.LAGOS" for s in NGX_SYMBOLS]
