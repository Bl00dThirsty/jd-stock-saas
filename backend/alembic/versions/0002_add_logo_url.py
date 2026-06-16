"""add logo_url to stocks

Revision ID: 0002_add_logo_url
Revises: 0001_initial
Create Date: 2026-06-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_add_logo_url"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("stocks", sa.Column("logo_url", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("stocks", "logo_url")
