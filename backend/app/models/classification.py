"""Classification hierarchy (OSLC ClassStructure-style) + per-class attribute specs.

See schema-enrichment-prompt.md §6. A classification (e.g. EQUITY → COMMON)
declares which attributes (PE_RATIO, DIVIDEND_YIELD…) its members may carry.
"""

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.meta import SphereMixin, StatusMixin
from app.core.rowstamp import RowstampMixin
from app.models.common import TimestampMixin

if TYPE_CHECKING:
    pass


class Classification(Base, TimestampMixin, RowstampMixin, SphereMixin, StatusMixin):
    __tablename__ = "classification"

    id: Mapped[int] = mapped_column(primary_key=True)
    classstructureid: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(255))
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("classification.id", ondelete="SET NULL"), default=None
    )
    hierarchypath: Mapped[str | None] = mapped_column(String(512), index=True)
    is_linear: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    children: Mapped[list["Classification"]] = relationship(back_populates="parent")
    parent: Mapped["Classification | None"] = relationship(
        back_populates="children", remote_side="Classification.id"
    )
    attributes: Mapped[list["ClassificationAttribute"]] = relationship(
        back_populates="classification", cascade="all, delete-orphan"
    )


class ClassificationAttribute(Base, TimestampMixin, RowstampMixin):
    """A spec slot a classification's members can populate (EAV definition)."""

    __tablename__ = "classification_attribute"

    id: Mapped[int] = mapped_column(primary_key=True)
    classstructure_id: Mapped[int] = mapped_column(
        ForeignKey("classification.id", ondelete="CASCADE"), index=True, nullable=False
    )
    assetattrid: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255))
    # ALN / NUMERIC / DATE / BOOLEAN / ASSET / MEMO
    attribute_type: Mapped[str] = mapped_column(String(16), default="ALN", server_default="ALN")
    measureunitid: Mapped[str | None] = mapped_column(String(32))
    mandatory: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    displaysequence: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    defaultvalue: Mapped[str | None] = mapped_column(String(255))
    minvalue: Mapped[float | None] = mapped_column(Float)
    maxvalue: Mapped[float | None] = mapped_column(Float)

    classification: Mapped["Classification"] = relationship(back_populates="attributes")
