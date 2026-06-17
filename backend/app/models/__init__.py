"""SQLAlchemy ORM models.

Importing every model here ensures they are registered on ``Base.metadata``
so Alembic autogenerate and ``create_all`` see the full schema.
"""

from app.models.alert import PriceAlert
from app.models.audit_log import AuditLog
from app.models.classification import Classification, ClassificationAttribute
from app.models.news import News
from app.models.object_history import ObjectHistory
from app.models.portfolio import Portfolio, PortfolioHolding
from app.models.price import PriceHistory
from app.models.stock import Stock
from app.models.stock_attribute import StockAttribute, StockAttributeDef
from app.models.stock_status_history import StockStatusHistory
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
    "Classification",
    "ClassificationAttribute",
    "StockAttribute",
    "StockAttributeDef",
    "StockStatusHistory",
    "ObjectHistory",
]
