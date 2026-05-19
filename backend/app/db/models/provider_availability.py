from datetime import datetime
from datetime import time as PythonTime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProviderAvailability(Base):
    __tablename__ = "provider_availability"
    __table_args__ = (
        Index("ix_provider_availability_provider_weekday", "provider_user_id", "weekday"),
        Index("ix_provider_availability_org_weekday", "organization_id", "weekday"),
    )

    id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    provider_user_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    organization_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
    )
    weekday: Mapped[int] = mapped_column(Integer, index=True)
    start_time: Mapped[PythonTime] = mapped_column(Time)
    end_time: Mapped[PythonTime] = mapped_column(Time)
    timezone: Mapped[str] = mapped_column(String, default="America/Toronto")
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    provider_user: Mapped["User"] = relationship("User")
    organization: Mapped[Optional["Organization"]] = relationship("Organization")
