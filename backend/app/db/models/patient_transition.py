from datetime import date as PythonDate
from datetime import datetime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PatientTransition(Base):
    __tablename__ = "patients_transition"
    __table_args__ = (
        Index("ix_patients_transition_org_name", "organization_id", "full_name"),
        Index("ix_patients_transition_org_phone", "organization_id", "phone"),
    )

    id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
    )
    base44_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String, index=True)
    date_of_birth: Mapped[Optional[PythonDate]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String)
    phone: Mapped[Optional[str]] = mapped_column(String, index=True)
    email: Mapped[Optional[str]] = mapped_column(String, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="active", index=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    visits: Mapped[list["PatientVisitTransition"]] = relationship(
        "PatientVisitTransition",
        back_populates="patient",
        cascade="all, delete-orphan",
    )


class PatientVisitTransition(Base):
    __tablename__ = "patient_visits_transition"
    __table_args__ = (
        Index("ix_patient_visits_transition_patient_date", "patient_id", "visit_date"),
        Index("ix_patient_visits_transition_org_date", "organization_id", "visit_date"),
    )

    id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients_transition.id", ondelete="CASCADE"),
        index=True,
    )
    organization_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
    )
    provider_user_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    visit_date: Mapped[PythonDate] = mapped_column(Date, index=True)
    reason: Mapped[Optional[str]] = mapped_column(String)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="completed", index=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped["PatientTransition"] = relationship(
        "PatientTransition",
        back_populates="visits",
    )
