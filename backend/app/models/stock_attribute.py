"""Stock EAV attributes — dynamic boursier specs per stock.

See schema-enrichment-prompt.md §1 (stock_attributes). Each attribute id is
defined once in ``stock_attribute_defs``; values live in ``stock_attributes``
with a typed slot (alnvalue / numvalue) and a measure unit.
"""

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.meta import AuditableMixin
from app.core.rowstamp import RowstampMixin
from app.models.common import TimestampMixin

if TYPE_CHECKING:
    from app.models.stock import Stock


class StockAttributeDef(Base, TimestampMixin, RowstampMixin):
    __tablename__ = "stock_attribute_defs"

    id: Mapped[int] = mapped_column(primary_key=True)
    assetattrid: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    # ALN / NUMERIC / DATE / BOOLEAN / ASSET / MEMO
    attribute_type: Mapped[str] = mapped_column(
        String(16), default="NUMERIC", server_default="NUMERIC"
    )
    measureunitid: Mapped[str | None] = mapped_column(String(32))

    values: Mapped[list["StockAttribute"]] = relationship(
        back_populates="definition", cascade="all, delete-orphan"
    )


class StockAttribute(Base, TimestampMixin, RowstampMixin, AuditableMixin):
    __tablename__ = "stock_attributes"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(
        ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    attribute_def_id: Mapped[int] = mapped_column(
        ForeignKey("stock_attribute_defs.id", ondelete="CASCADE"), nullable=False
    )
    alnvalue: Mapped[str | None] = mapped_column(String(512))
    numvalue: Mapped[float | None] = mapped_column(Float)
    measureunitid: Mapped[str | None] = mapped_column(String(32))
    # item / classification / override
    inheritedfrom: Mapped[str] = mapped_column(
        String(16), default="override", server_default="override"
    )

    stock: Mapped["Stock"] = relationship(back_populates="attributes")
    definition: Mapped["StockAttributeDef"] = relationship(back_populates="values")
