"""SQLAlchemy ORM models.

Importing every model here ensures they are registered on ``Base.metadata``
so Alembic autogenerate and ``create_all`` see the full schema.
"""

from app.models.alert import PriceAlert
from app.models.audit_log import AuditLog
from app.models.news import News
from app.models.portfolio import Portfolio, PortfolioHolding
from app.models.price import PriceHistory
from app.models.stock import Stock
from app.models.user import User

__all__ = [
    "User",
    "Stock",
    "PriceHistory",
    "Portfolio",
    "PortfolioHolding",
    "PriceAlert",
    "AuditLog",
    "News",
]
