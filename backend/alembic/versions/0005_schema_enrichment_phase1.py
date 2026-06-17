"""schema enrichment phase 1: classification, stock EAV, status history, object_history

Additive only — preserves existing data. Adds OSLC-style metadata to `stocks`
and creates the classification / EAV / audit tables.

Revision ID: 0005_schema_enrichment_phase1
Revises: 0004_add_password_auth
Create Date: 2026-06-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_schema_enrichment_phase1"
down_revision: Union[str, None] = "0004_add_password_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    # ── classification ────────────────────────────────────────────────
    op.create_table(
        "classification",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("classstructureid", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("hierarchypath", sa.String(length=512), nullable=True),
        sa.Column("is_linear", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("siteid", sa.String(length=32), nullable=True),
        sa.Column("orgid", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="ACTIVE", nullable=False),
        sa.Column("statusdate", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("status_memo", sa.String(length=512), nullable=True),
        sa.Column("_rowstamp", sa.String(length=40), nullable=False, server_default="0"),
        *_timestamps(),
        sa.ForeignKeyConstraint(["parent_id"], ["classification.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("classstructureid"),
    )
    op.create_index("ix_classification_classstructureid", "classification", ["classstructureid"])
    op.create_index("ix_classification_hierarchypath", "classification", ["hierarchypath"])
    op.create_index("ix_classification_siteid", "classification", ["siteid"])
    op.create_index("ix_classification_status", "classification", ["status"])

    # ── classification_attribute ─────────────────────────────────────
    op.create_table(
        "classification_attribute",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("classstructure_id", sa.Integer(), nullable=False),
        sa.Column("assetattrid", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("attribute_type", sa.String(length=16), server_default="ALN", nullable=False),
        sa.Column("measureunitid", sa.String(length=32), nullable=True),
        sa.Column("mandatory", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("displaysequence", sa.Integer(), server_default="0", nullable=False),
        sa.Column("defaultvalue", sa.String(length=255), nullable=True),
        sa.Column("minvalue", sa.Float(), nullable=True),
        sa.Column("maxvalue", sa.Float(), nullable=True),
        sa.Column("_rowstamp", sa.String(length=40), nullable=False, server_default="0"),
        *_timestamps(),
        sa.ForeignKeyConstraint(["classstructure_id"], ["classification.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_classification_attribute_classstructure_id", "classification_attribute", ["classstructure_id"])
    op.create_index("ix_classification_attribute_assetattrid", "classification_attribute", ["assetattrid"])

    # ── stock_attribute_defs ─────────────────────────────────────────
    op.create_table(
        "stock_attribute_defs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("assetattrid", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("attribute_type", sa.String(length=16), server_default="NUMERIC", nullable=False),
        sa.Column("measureunitid", sa.String(length=32), nullable=True),
        sa.Column("_rowstamp", sa.String(length=40), nullable=False, server_default="0"),
        *_timestamps(),
        sa.UniqueConstraint("assetattrid"),
    )
    op.create_index("ix_stock_attribute_defs_assetattrid", "stock_attribute_defs", ["assetattrid"])

    # ── stock_attributes (EAV) ───────────────────────────────────────
    op.create_table(
        "stock_attributes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stock_id", sa.Integer(), nullable=False),
        sa.Column("attribute_def_id", sa.Integer(), nullable=False),
        sa.Column("alnvalue", sa.String(length=512), nullable=True),
        sa.Column("numvalue", sa.Float(), nullable=True),
        sa.Column("measureunitid", sa.String(length=32), nullable=True),
        sa.Column("inheritedfrom", sa.String(length=16), server_default="override", nullable=False),
        sa.Column("changeby", sa.String(length=64), nullable=True),
        sa.Column("changedate", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("description", sa.String(length=512), nullable=True),
        sa.Column("_rowstamp", sa.String(length=40), nullable=False, server_default="0"),
        *_timestamps(),
        sa.ForeignKeyConstraint(["stock_id"], ["stocks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["attribute_def_id"], ["stock_attribute_defs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_stock_attributes_stock_id", "stock_attributes", ["stock_id"])

    # ── stock_status_history ─────────────────────────────────────────
    op.create_table(
        "stock_status_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stock_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("statusdate", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("changeby", sa.String(length=64), nullable=True),
        sa.Column("memo", sa.String(length=512), nullable=True),
        sa.Column("_rowstamp", sa.String(length=40), nullable=False, server_default="0"),
        *_timestamps(),
        sa.ForeignKeyConstraint(["stock_id"], ["stocks.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_stock_status_history_stock_id", "stock_status_history", ["stock_id"])

    # ── object_history (unified audit) ───────────────────────────────
    op.create_table(
        "object_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("object_type", sa.String(length=32), nullable=False),
        sa.Column("object_id", sa.String(length=64), nullable=False),
        sa.Column("field_name", sa.String(length=64), nullable=True),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("changeby", sa.Uuid(), nullable=True),
        sa.Column("changedate", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("transaction_id", sa.String(length=64), nullable=True),
        sa.Column("reason", sa.String(length=512), nullable=True),
        sa.Column("source", sa.String(length=32), server_default="API", nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_object_history_transaction_id", "object_history", ["transaction_id"])
    op.create_index("ix_object_history_object", "object_history", ["object_type", "object_id", "changedate"])

    # ── stocks: OSLC metadata columns (additive) ─────────────────────
    op.add_column("stocks", sa.Column("classstructureid", sa.String(length=64), nullable=True))
    op.add_column("stocks", sa.Column("hierarchypath", sa.String(length=512), nullable=True))
    op.add_column("stocks", sa.Column("status", sa.String(length=32), server_default="LISTING", nullable=False))
    op.add_column("stocks", sa.Column("statusdate", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    op.add_column("stocks", sa.Column("status_memo", sa.String(length=512), nullable=True))
    op.add_column("stocks", sa.Column("siteid", sa.String(length=32), nullable=True))
    op.add_column("stocks", sa.Column("orgid", sa.String(length=32), nullable=True))
    op.add_column("stocks", sa.Column("changeby", sa.String(length=64), nullable=True))
    op.add_column("stocks", sa.Column("changedate", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    op.add_column("stocks", sa.Column("description", sa.String(length=512), nullable=True))
    op.add_column("stocks", sa.Column("_rowstamp", sa.String(length=40), server_default="0", nullable=False))
    op.create_index("ix_stocks_classstructureid", "stocks", ["classstructureid"])
    op.create_index("ix_stocks_hierarchypath", "stocks", ["hierarchypath"])
    op.create_index("ix_stocks_status", "stocks", ["status"])
    op.create_index("ix_stocks_siteid", "stocks", ["siteid"])

    # ── Data enrichment for existing rows (priority 9) ───────────────
    # Default sphere for the existing NGX board.
    op.execute("UPDATE stocks SET siteid = 'NGX', orgid = 'SEC' WHERE siteid IS NULL")

    # Seed the base classification tree (defaults fill timestamps/_rowstamp/status).
    op.execute(
        """
        INSERT INTO classification (classstructureid, description, hierarchypath) VALUES
          ('ASSET',  'Financial asset',       'ASSET'),
          ('EQUITY', 'Common equity',         'ASSET \\ EQUITY'),
          ('BOND',   'Fixed income',          'ASSET \\ BOND'),
          ('ETF',    'Exchange-traded fund',  'ASSET \\ ETF')
        """
    )
    op.execute(
        """
        UPDATE classification SET parent_id =
          (SELECT id FROM classification WHERE classstructureid = 'ASSET')
        WHERE classstructureid IN ('EQUITY', 'BOND', 'ETF')
        """
    )

    # Existing NGX listings are all common equities.
    op.execute(
        """
        UPDATE stocks
        SET classstructureid = 'EQUITY',
            hierarchypath = 'NGX \\ ' || COALESCE(sector, 'UNCLASSIFIED') || ' \\ ' || symbol
        WHERE classstructureid IS NULL
        """
    )

    # Seed common boursier attribute definitions (EAV vocabulary).
    op.execute(
        """
        INSERT INTO stock_attribute_defs (assetattrid, description, attribute_type, measureunitid) VALUES
          ('PE_RATIO',       'Price/earnings ratio',   'NUMERIC', NULL),
          ('DIVIDEND_YIELD', 'Dividend yield',         'NUMERIC', 'PERCENT'),
          ('EPS',            'Earnings per share',     'NUMERIC', 'NGN'),
          ('MARKET_CAP',     'Market capitalisation',  'NUMERIC', 'NGN')
        """
    )


def downgrade() -> None:
    op.drop_index("ix_stocks_siteid", table_name="stocks")
    op.drop_index("ix_stocks_status", table_name="stocks")
    op.drop_index("ix_stocks_hierarchypath", table_name="stocks")
    op.drop_index("ix_stocks_classstructureid", table_name="stocks")
    for col in (
        "_rowstamp", "description", "changedate", "changeby", "orgid", "siteid",
        "status_memo", "statusdate", "status", "hierarchypath", "classstructureid",
    ):
        op.drop_column("stocks", col)

    op.drop_table("object_history")
    op.drop_table("stock_status_history")
    op.drop_table("stock_attributes")
    op.drop_table("stock_attribute_defs")
    op.drop_table("classification_attribute")
    op.drop_table("classification")
