"""add role, totp fields to users + audit_logs table

Revision ID: 0003_add_security_models
Revises: 0002_add_logo_url
Create Date: 2026-06-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_security_models"
down_revision: Union[str, None] = "0002_add_logo_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Users: new columns ──────────────────────────────────────────
    op.add_column("users", sa.Column("role", sa.String(length=16), server_default="free", nullable=False))
    op.add_column("users", sa.Column("totp_secret", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("totp_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("users", sa.Column("consent_given_at", sa.DateTime(timezone=True), nullable=True))

    # ─── Audit logs ──────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True, index=True),
        sa.Column("action", sa.String(length=64), nullable=False, index=True),
        sa.Column("resource_type", sa.String(length=64), nullable=True),
        sa.Column("resource_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_column("users", "consent_given_at")
    op.drop_column("users", "totp_enabled")
    op.drop_column("users", "totp_secret")
    op.drop_column("users", "role")
