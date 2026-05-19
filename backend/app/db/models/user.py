from datetime import datetime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email_status", "email", "status"),
        Index("ix_users_firebase_uid", "firebase_uid"),
    )

    id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    base44_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    firebase_uid: Mapped[Optional[str]] = mapped_column(String, unique=True)
    primary_organization_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String, index=True)
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

    primary_organization: Mapped[Optional["Organization"]] = relationship(
        "Organization",
        back_populates="primary_users",
        foreign_keys=[primary_organization_id],
    )
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        foreign_keys="UserRole.user_id",
        cascade="all, delete-orphan",
    )
    assigned_user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="assigned_by_user",
        foreign_keys="UserRole.assigned_by_user_id",
    )
