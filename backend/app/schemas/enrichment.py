"""Pydantic schemas for the enriched (OSLC-style) entities — phase 1."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class _ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ClassificationAttributeOut(_ORM):
    id: int
    assetattrid: str
    description: str | None = None
    attribute_type: str
    measureunitid: str | None = None
    mandatory: bool
    displaysequence: int
    defaultvalue: str | None = None
    minvalue: float | None = None
    maxvalue: float | None = None


class ClassificationOut(_ORM):
    id: int
    classstructureid: str
    description: str | None = None
    parent_id: int | None = None
    hierarchypath: str | None = None
    is_linear: bool
    status: str
    siteid: str | None = None
    orgid: str | None = None


class ClassificationDetail(ClassificationOut):
    attributes: list[ClassificationAttributeOut] = []


class StockAttributeOut(_ORM):
    id: int
    attribute_def_id: int
    assetattrid: str | None = None  # filled from the joined definition
    alnvalue: str | None = None
    numvalue: float | None = None
    measureunitid: str | None = None
    inheritedfrom: str


class StockStatusHistoryOut(_ORM):
    id: int
    status: str
    statusdate: datetime
    changeby: str | None = None
    memo: str | None = None


class ObjectHistoryOut(_ORM):
    id: str
    object_type: str
    object_id: str
    field_name: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    transaction_id: str | None = None
    reason: str | None = None
    source: str
    changedate: datetime


class StatusChangeRequest(BaseModel):
    """Body for a validated status transition."""

    status: str
    memo: str | None = None
