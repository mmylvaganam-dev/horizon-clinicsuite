from datetime import datetime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        Index("ix_organization_members_org_status", "organization_id", "status"),
        Index("ix_organization_members_user_org", "user_id", "organization_id"),
        Index("ix_organization_members_role_status", "role", "status"),
    )

    id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    organization_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    role: Mapped[str] = mapped_column(String, index=True)
    status: Mapped[str] = mapped_column(String, default="active", index=True)
    invited_by_user_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    invited_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[invited_by_user_id],
    )
