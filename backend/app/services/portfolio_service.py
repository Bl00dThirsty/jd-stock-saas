"""Portfolio valuation helpers."""

from app.models.portfolio import Portfolio


def serialize_portfolio(portfolio: Portfolio) -> dict:
    """Build a valued PortfolioOut-compatible dict from ORM relationships.

    Assumes ``portfolio.holdings`` and each ``holding.stock`` are loaded.
    """
    holdings_out: list[dict] = []
    total_value = 0.0
    total_cost = 0.0

    for h in portfolio.holdings:
        last_price = h.stock.last_price
        cost_basis = h.shares * h.avg_price
        market_value = h.shares * last_price if last_price is not None else None
        gain_loss = (market_value - cost_basis) if market_value is not None else None
        gain_loss_pct = (
            (gain_loss / cost_basis * 100) if gain_loss is not None and cost_basis else None
        )

        total_cost += cost_basis
        if market_value is not None:
            total_value += market_value

        holdings_out.append(
            {
                "id": h.id,
                "symbol": h.stock.symbol,
                "name": h.stock.name,
                "logo_url": h.stock.logo_url,
                "shares": h.shares,
                "avg_price": h.avg_price,
                "last_price": last_price,
                "market_value": round(market_value, 2) if market_value is not None else None,
                "cost_basis": round(cost_basis, 2),
                "gain_loss": round(gain_loss, 2) if gain_loss is not None else None,
                "gain_loss_percent": round(gain_loss_pct, 2) if gain_loss_pct is not None else None,
            }
        )

    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "created_at": portfolio.created_at,
        "holdings": holdings_out,
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_gain_loss": round(total_value - total_cost, 2),
    }
