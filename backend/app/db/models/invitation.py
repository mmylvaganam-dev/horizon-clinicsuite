from datetime import datetime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Invitation(Base):
    __tablename__ = "invitations"
    __table_args__ = (
        Index("ix_invitations_org_status", "organization_id", "status"),
        Index("ix_invitations_email_status", "invited_email", "status"),
        Index("ix_invitations_role_status", "invited_role", "status"),
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
    invited_email: Mapped[str] = mapped_column(String, index=True)
    invited_role: Mapped[str] = mapped_column(String, index=True)
    invited_by_user_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    invited_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[invited_by_user_id],
    )
