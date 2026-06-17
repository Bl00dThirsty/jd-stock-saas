"""add email/password auth: users.password_hash + nullable google_id

Revision ID: 0004_add_password_auth
Revises: 0003_add_security_models
Create Date: 2026-06-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_add_password_auth"
down_revision: Union[str, None] = "0003_add_security_models"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("password_hash", sa.String(length=255), nullable=True)
    )
    # Email/password users have no Google identity → google_id must allow NULL.
    # The existing UNIQUE index still holds (Postgres treats NULLs as distinct).
    op.alter_column(
        "users", "google_id", existing_type=sa.String(length=255), nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        "users", "google_id", existing_type=sa.String(length=255), nullable=False
    )
    op.drop_column("users", "password_hash")
