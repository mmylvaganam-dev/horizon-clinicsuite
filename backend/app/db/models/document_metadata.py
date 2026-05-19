from datetime import datetime
from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DocumentMetadata(Base):
    __tablename__ = "document_metadata"
    __table_args__ = (
        Index("ix_document_metadata_org_created", "organization_id", "created_at"),
        Index("ix_document_metadata_uploaded_by", "uploaded_by_user_id"),
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
    uploaded_by_user_id: Mapped[Optional[PythonUUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    file_name: Mapped[str] = mapped_column(String, index=True)
    storage_path: Mapped[str] = mapped_column(String, unique=True, index=True)
    download_url: Mapped[Optional[str]] = mapped_column(String)
    mime_type: Mapped[Optional[str]] = mapped_column(String)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    uploaded_by_user: Mapped[Optional["User"]] = relationship("User")
