from datetime import datetime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PharmacySale(Base):
    __tablename__ = "pharmacy_sales_live"
    __table_args__ = (
        Index("ix_pharmacy_sales_live_org_created", "organization_id", "created_at"),
        Index("ix_pharmacy_sales_live_receipt", "receipt_number"),
        Index("ix_pharmacy_sales_live_status", "status"),
    )

    id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    organization_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
    )
    sold_by_user_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    receipt_number: Mapped[str] = mapped_column(String, unique=True, index=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String, index=True)
    payment_method: Mapped[str] = mapped_column(String, default="cash", index=True)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(String, default="completed", index=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    sold_by_user: Mapped[Optional["User"]] = relationship("User")
    items: Mapped[list["PharmacySaleItem"]] = relationship(
        "PharmacySaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
    )


class PharmacySaleItem(Base):
    __tablename__ = "pharmacy_sale_items_live"
    __table_args__ = (
        Index("ix_pharmacy_sale_items_live_sale", "sale_id"),
        Index("ix_pharmacy_sale_items_live_product", "product_id"),
    )

    id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    sale_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pharmacy_sales_live.id", ondelete="CASCADE"),
        index=True,
    )
    product_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pharmacy_products.id", ondelete="SET NULL"),
        index=True,
    )
    product_name: Mapped[str] = mapped_column(String)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)

    sale: Mapped["PharmacySale"] = relationship("PharmacySale", back_populates="items")
    product: Mapped[Optional["PharmacyProduct"]] = relationship("PharmacyProduct")
