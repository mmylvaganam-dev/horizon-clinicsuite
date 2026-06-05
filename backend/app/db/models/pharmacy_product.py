from datetime import datetime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PharmacyProduct(Base):
    __tablename__ = "pharmacy_products"
    __table_args__ = (
        Index("ix_pharmacy_products_org_name", "organization_id", "name"),
        Index("ix_pharmacy_products_org_sku", "organization_id", "sku"),
        Index("ix_pharmacy_products_stock", "quantity_on_hand"),
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
    base44_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    sku: Mapped[Optional[str]] = mapped_column(String, index=True)
    batch_number: Mapped[Optional[str]] = mapped_column(String, index=True)
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0, index=True)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(String, default="active", index=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    organization: Mapped[Optional["Organization"]] = relationship("Organization")
