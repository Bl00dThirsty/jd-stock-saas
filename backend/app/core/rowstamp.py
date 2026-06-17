"""`_rowstamp` generation + mixin for optimistic-locking / change detection.

Mirrors IBM Maximo's opaque ``_rowstamp``: an value that changes on every
write, letting clients detect concurrent modifications.
"""

import secrets
import time

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column


def new_rowstamp() -> str:
    """Opaque, monotonic-ish token: millis (hex) + random suffix."""
    return f"{int(time.time() * 1000):x}{secrets.token_hex(4)}"


class RowstampMixin:
    """Adds a ``_rowstamp`` column that refreshes on insert and update."""

    rowstamp: Mapped[str] = mapped_column(
        "_rowstamp",
        String(40),
        default=new_rowstamp,
        onupdate=new_rowstamp,
        nullable=False,
    )
