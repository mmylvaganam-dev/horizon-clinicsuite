from datetime import date as PythonDate
from datetime import datetime
from datetime import time as PythonTime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AppointmentRequest(Base):
    __tablename__ = "appointment_requests"
    __table_args__ = (
        Index("ix_appointment_requests_org_status", "organization_id", "status"),
        Index("ix_appointment_requests_provider_date", "requested_provider_user_id", "requested_date"),
        Index("ix_appointment_requests_created_by", "created_by_user_id"),
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
    patient_name: Mapped[str] = mapped_column(String, index=True)
    patient_email: Mapped[Optional[str]] = mapped_column(String, index=True)
    requested_provider_user_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    requested_date: Mapped[PythonDate] = mapped_column(Date, index=True)
    requested_time: Mapped[PythonTime] = mapped_column(Time)
    request_reason: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    created_by_user_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    requested_provider_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[requested_provider_user_id],
    )
    created_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[created_by_user_id],
    )
