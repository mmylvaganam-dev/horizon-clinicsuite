from datetime import date
from typing import Optional
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import PatientTransition, PatientVisitTransition
from app.db.session import SessionLocal
from app.services.audit_service import log_audit_event


MANAGE_ROLES = {"admin", "provider", "staff"}
READ_ROLES = MANAGE_ROLES | {"viewer"}


def list_patients(rbac_context: dict, query: str = "") -> dict:
    _require_read_role(rbac_context)
    normalized_query = (query or "").strip()

    if SessionLocal is None:
        return {"patients": [], "source": "placeholder"}

    try:
        with SessionLocal() as db:
            statement = select(PatientTransition).order_by(PatientTransition.created_at.desc()).limit(200)
            if normalized_query:
                like_query = f"%{normalized_query}%"
                statement = statement.where(
                    or_(
                        PatientTransition.full_name.ilike(like_query),
                        PatientTransition.phone.ilike(like_query),
                        PatientTransition.email.ilike(like_query),
                    )
                )
            patients = db.execute(statement).scalars().all()
            return {"patients": [serialize_patient(patient) for patient in patients], "source": "postgresql"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patient list failed: {exc.__class__.__name__}",
        ) from exc


def create_patient(payload: dict, rbac_context: dict) -> dict:
    _require_manage_role(rbac_context)
    patient_payload = _normalize_patient_payload(payload, rbac_context)

    if SessionLocal is None:
        return {
            "created": True,
            "patient": {"id": f"placeholder-patient-{uuid4()}", **patient_payload},
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            patient = PatientTransition(
                organization_id=_uuid_or_none(patient_payload.get("organization_id")),
                base44_id=patient_payload.get("base44_id"),
                full_name=patient_payload["full_name"],
                date_of_birth=_parse_date_or_none(patient_payload.get("date_of_birth")),
                gender=patient_payload.get("gender"),
                phone=patient_payload.get("phone"),
                email=patient_payload.get("email"),
                address=patient_payload.get("address"),
                status="active",
                metadata_json={"transition_scope": "sri_lanka_patient_register"},
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            serialized = serialize_patient(patient)
            _log_patient_event("patient_transition_created", serialized, rbac_context)
            return {"created": True, "patient": serialized, "source": "postgresql"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patient create failed: {exc.__class__.__name__}",
        ) from exc


def list_patient_visits(patient_id: str, rbac_context: dict) -> dict:
    _require_read_role(rbac_context)
    patient_uuid = _required_uuid(patient_id, "patient_id")

    if SessionLocal is None:
        return {"visits": [], "source": "placeholder"}

    try:
        with SessionLocal() as db:
            visits = db.execute(
                select(PatientVisitTransition)
                .where(PatientVisitTransition.patient_id == patient_uuid)
                .order_by(PatientVisitTransition.visit_date.desc(), PatientVisitTransition.created_at.desc())
            ).scalars().all()
            return {"visits": [serialize_visit(visit) for visit in visits], "source": "postgresql"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patient visits load failed: {exc.__class__.__name__}",
        ) from exc


def create_patient_visit(payload: dict, rbac_context: dict) -> dict:
    _require_manage_role(rbac_context)
    visit_payload = _normalize_visit_payload(payload, rbac_context)

    if SessionLocal is None:
        return {
            "created": True,
            "visit": {"id": f"placeholder-visit-{uuid4()}", **visit_payload},
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            patient = db.get(PatientTransition, _required_uuid(visit_payload["patient_id"], "patient_id"))
            if patient is None:
                raise HTTPException(status_code=404, detail="Patient not found")

            visit = PatientVisitTransition(
                patient_id=patient.id,
                organization_id=_uuid_or_none(visit_payload.get("organization_id")) or patient.organization_id,
                provider_user_id=_uuid_or_none(visit_payload.get("provider_user_id")),
                visit_date=_parse_date_or_none(visit_payload.get("visit_date")) or date.today(),
                reason=visit_payload.get("reason"),
                notes=visit_payload.get("notes"),
                status="completed",
                metadata_json={"transition_scope": "single_visit_register"},
            )
            db.add(visit)
            db.commit()
            db.refresh(visit)
            serialized = serialize_visit(visit)
            _log_patient_event("patient_visit_transition_created", serialized, rbac_context)
            return {"created": True, "visit": serialized, "source": "postgresql"}
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patient visit create failed: {exc.__class__.__name__}",
        ) from exc


def serialize_patient(patient: PatientTransition) -> dict:
    return {
        "id": str(patient.id),
        "organization_id": str(patient.organization_id) if patient.organization_id else None,
        "base44_id": patient.base44_id,
        "full_name": patient.full_name,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "gender": patient.gender,
        "phone": patient.phone,
        "email": patient.email,
        "address": patient.address,
        "status": patient.status,
        "created_at": patient.created_at.isoformat() if patient.created_at else None,
        "source": "postgresql",
    }


def serialize_visit(visit: PatientVisitTransition) -> dict:
    return {
        "id": str(visit.id),
        "patient_id": str(visit.patient_id),
        "organization_id": str(visit.organization_id) if visit.organization_id else None,
        "provider_user_id": str(visit.provider_user_id) if visit.provider_user_id else None,
        "visit_date": visit.visit_date.isoformat() if visit.visit_date else None,
        "reason": visit.reason,
        "notes": visit.notes,
        "status": visit.status,
        "created_at": visit.created_at.isoformat() if visit.created_at else None,
        "source": "postgresql",
    }


def _normalize_patient_payload(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}
    full_name = (payload.get("full_name") or payload.get("name") or "").strip()
    if not full_name:
        raise HTTPException(status_code=422, detail="Patient name is required")

    return {
        "organization_id": payload.get("organization_id") or app_user.get("primary_organization_id"),
        "base44_id": (payload.get("base44_id") or "").strip() or None,
        "full_name": full_name,
        "date_of_birth": (payload.get("date_of_birth") or "").strip() or None,
        "gender": (payload.get("gender") or "").strip() or None,
        "phone": (payload.get("phone") or "").strip() or None,
        "email": (payload.get("email") or "").strip().lower() or None,
        "address": (payload.get("address") or "").strip() or None,
    }


def _normalize_visit_payload(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}
    patient_id = (payload.get("patient_id") or "").strip()
    if not patient_id:
        raise HTTPException(status_code=422, detail="patient_id is required")

    return {
        "patient_id": patient_id,
        "organization_id": payload.get("organization_id") or app_user.get("primary_organization_id"),
        "provider_user_id": payload.get("provider_user_id") or app_user.get("id"),
        "visit_date": payload.get("visit_date") or date.today().isoformat(),
        "reason": (payload.get("reason") or "").strip() or None,
        "notes": (payload.get("notes") or "").strip() or None,
    }


def _parse_date_or_none(value: Optional[str]):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid date: {value}") from exc


def _required_uuid(value: str, field_name: str) -> UUID:
    try:
        return UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"{field_name} must be a valid UUID") from exc


def _uuid_or_none(value: Optional[str]):
    if not value:
        return None
    try:
        return UUID(str(value))
    except ValueError:
        return None


def _require_manage_role(rbac_context: dict) -> None:
    roles = set(rbac_context.get("roles") or [])
    if roles.isdisjoint(MANAGE_ROLES):
        raise HTTPException(status_code=403, detail="User does not have the required role")


def _require_read_role(rbac_context: dict) -> None:
    roles = set(rbac_context.get("roles") or [])
    if roles.isdisjoint(READ_ROLES):
        raise HTTPException(status_code=403, detail="User does not have the required role")


def _log_patient_event(action_type: str, resource: dict, rbac_context: dict) -> None:
    app_user = rbac_context.get("app_user") or {}
    log_audit_event(
        action_type=action_type,
        resource_type="patient_transition",
        resource_id=resource.get("id"),
        organization_id=app_user.get("primary_organization_id"),
        user_id=app_user.get("id"),
        metadata_json={"transition_module": True},
    )
