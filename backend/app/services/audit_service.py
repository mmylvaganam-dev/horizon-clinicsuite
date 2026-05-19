from typing import Optional
from uuid import UUID
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import AuditLog
from app.db.session import SessionLocal


PLACEHOLDER_AUDIT_LOGS = [
    {
        "id": "placeholder-audit-log",
        "organization_id": None,
        "user_id": None,
        "action_type": "scaffold_viewed",
        "resource_type": "audit_log",
        "resource_id": "placeholder",
        "metadata_json": {"source": "placeholder"},
        "created_at": None,
        "source": "placeholder",
    }
]


def log_audit_event(
    action_type: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    metadata_json: Optional[dict] = None,
    organization_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> dict:
    payload = {
        "id": f"placeholder-audit-{uuid4()}",
        "organization_id": organization_id,
        "user_id": user_id,
        "action_type": action_type,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "metadata_json": metadata_json or {},
        "created_at": None,
        "source": "placeholder",
    }

    if SessionLocal is None:
        return {"logged": True, "audit_log": payload, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            audit_log = AuditLog(
                organization_id=_uuid_or_none(organization_id),
                user_id=_uuid_or_none(user_id),
                action_type=action_type,
                resource_type=resource_type,
                resource_id=resource_id,
                metadata_json=metadata_json or {},
            )
            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)
            return {
                "logged": True,
                "audit_log": serialize_audit_log(audit_log),
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return {"logged": True, "audit_log": payload, "source": "placeholder"}


def list_audit_logs() -> dict:
    if SessionLocal is None:
        return _placeholder_audit_logs_response()

    try:
        with SessionLocal() as db:
            audit_logs = db.execute(
                select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)
            ).scalars().all()
            return {
                "audit_logs": [serialize_audit_log(audit_log) for audit_log in audit_logs],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_audit_logs_response()


def serialize_audit_log(audit_log: AuditLog) -> dict:
    return {
        "id": str(audit_log.id),
        "organization_id": str(audit_log.organization_id) if audit_log.organization_id else None,
        "user_id": str(audit_log.user_id) if audit_log.user_id else None,
        "action_type": audit_log.action_type,
        "resource_type": audit_log.resource_type,
        "resource_id": audit_log.resource_id,
        "metadata_json": audit_log.metadata_json,
        "created_at": audit_log.created_at.isoformat() if audit_log.created_at else None,
        "source": "postgresql",
    }


def _placeholder_audit_logs_response() -> dict:
    return {
        "audit_logs": PLACEHOLDER_AUDIT_LOGS,
        "source": "placeholder",
    }


def _uuid_or_none(value: Optional[str]):
    if not value:
        return None

    try:
        return UUID(str(value))
    except ValueError:
        return None
