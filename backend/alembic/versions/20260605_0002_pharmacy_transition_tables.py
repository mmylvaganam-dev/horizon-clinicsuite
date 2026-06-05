"""pharmacy transition tables

Revision ID: 20260605_0002
Revises: 20260519_0001
Create Date: 2026-06-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260605_0002"
down_revision: Union[str, None] = "20260519_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pharmacy_products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("base44_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sku", sa.String(), nullable=True),
        sa.Column("batch_number", sa.String(), nullable=True),
        sa.Column("quantity_on_hand", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_pharmacy_products_base44_id", "pharmacy_products", ["base44_id"], unique=True)
    op.create_index("ix_pharmacy_products_batch_number", "pharmacy_products", ["batch_number"])
    op.create_index("ix_pharmacy_products_name", "pharmacy_products", ["name"])
    op.create_index("ix_pharmacy_products_org_name", "pharmacy_products", ["organization_id", "name"])
    op.create_index("ix_pharmacy_products_org_sku", "pharmacy_products", ["organization_id", "sku"])
    op.create_index("ix_pharmacy_products_organization_id", "pharmacy_products", ["organization_id"])
    op.create_index("ix_pharmacy_products_sku", "pharmacy_products", ["sku"])
    op.create_index("ix_pharmacy_products_status", "pharmacy_products", ["status"])
    op.create_index("ix_pharmacy_products_stock", "pharmacy_products", ["quantity_on_hand"])

    op.create_table(
        "pharmacy_sales_live",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sold_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("receipt_number", sa.String(), nullable=False),
        sa.Column("customer_name", sa.String(), nullable=True),
        sa.Column("payment_method", sa.String(), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount", sa.Numeric(12, 2), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_pharmacy_sales_live_customer_name", "pharmacy_sales_live", ["customer_name"])
    op.create_index("ix_pharmacy_sales_live_org_created", "pharmacy_sales_live", ["organization_id", "created_at"])
    op.create_index("ix_pharmacy_sales_live_organization_id", "pharmacy_sales_live", ["organization_id"])
    op.create_index("ix_pharmacy_sales_live_payment_method", "pharmacy_sales_live", ["payment_method"])
    op.create_index("ix_pharmacy_sales_live_receipt", "pharmacy_sales_live", ["receipt_number"])
    op.create_index("ix_pharmacy_sales_live_receipt_number", "pharmacy_sales_live", ["receipt_number"], unique=True)
    op.create_index("ix_pharmacy_sales_live_sold_by_user_id", "pharmacy_sales_live", ["sold_by_user_id"])
    op.create_index("ix_pharmacy_sales_live_status", "pharmacy_sales_live", ["status"])

    op.create_table(
        "pharmacy_sale_items_live",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("sale_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacy_sales_live.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacy_products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product_name", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
    )
    op.create_index("ix_pharmacy_sale_items_live_product", "pharmacy_sale_items_live", ["product_id"])
    op.create_index("ix_pharmacy_sale_items_live_product_id", "pharmacy_sale_items_live", ["product_id"])
    op.create_index("ix_pharmacy_sale_items_live_sale", "pharmacy_sale_items_live", ["sale_id"])
    op.create_index("ix_pharmacy_sale_items_live_sale_id", "pharmacy_sale_items_live", ["sale_id"])


def downgrade() -> None:
    op.drop_table("pharmacy_sale_items_live")
    op.drop_table("pharmacy_sales_live")
    op.drop_table("pharmacy_products")
