from datetime import date
from datetime import time
from typing import Optional
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import AppointmentRequest, ProviderAvailability
from app.db.session import SessionLocal


MANAGE_ROLES = {"admin", "provider", "staff"}
READ_ROLES = MANAGE_ROLES | {"viewer"}
SUPPORTED_STATUSES = {"pending", "confirmed", "cancelled", "completed"}

PLACEHOLDER_APPOINTMENT_REQUESTS = [
    {
        "id": "placeholder-appointment-request",
        "organization_id": None,
        "patient_name": "Test Patient",
        "patient_email": "test.patient@example.com",
        "requested_provider_user_id": "placeholder-provider-user",
        "requested_date": "2026-06-01",
        "requested_time": "09:30",
        "request_reason": "Scheduling request scaffold test",
        "status": "pending",
        "created_by_user_id": None,
        "created_at": None,
        "source": "placeholder",
    }
]


def create_appointment_request(payload: dict, rbac_context: dict) -> dict:
    _require_manage_role(rbac_context)
    normalized_payload = _normalize_request_payload(payload, rbac_context)

    if SessionLocal is None:
        appointment_request = _placeholder_appointment_request(normalized_payload)
        return {
            "appointment_request": appointment_request,
            "availability_lookup": _placeholder_availability_lookup(appointment_request),
            "created": True,
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            appointment_request = AppointmentRequest(
                organization_id=_uuid_or_none(normalized_payload.get("organization_id")),
                patient_name=normalized_payload["patient_name"],
                patient_email=normalized_payload.get("patient_email"),
                requested_provider_user_id=_uuid_or_none(normalized_payload.get("requested_provider_user_id")),
                requested_date=_parse_date(normalized_payload["requested_date"]),
                requested_time=_parse_time(normalized_payload["requested_time"]),
                request_reason=normalized_payload.get("request_reason"),
                status="pending",
                created_by_user_id=_uuid_or_none(normalized_payload.get("created_by_user_id")),
            )
            db.add(appointment_request)
            db.commit()
            db.refresh(appointment_request)
            serialized_request = serialize_appointment_request(appointment_request)
            return {
                "appointment_request": serialized_request,
                "availability_lookup": _database_availability_lookup(db, serialized_request),
                "created": True,
                "source": "postgresql",
            }
    except SQLAlchemyError:
        appointment_request = _placeholder_appointment_request(normalized_payload)
        return {
            "appointment_request": appointment_request,
            "availability_lookup": _placeholder_availability_lookup(appointment_request),
            "created": True,
            "source": "placeholder",
        }


def list_appointment_requests(rbac_context: dict) -> dict:
    _require_read_role(rbac_context)

    if SessionLocal is None:
        requests = _placeholder_appointment_requests(rbac_context)
        return {
            "appointment_requests": requests,
            "availability_lookup": [
                _placeholder_availability_lookup(appointment_request)
                for appointment_request in requests
            ],
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            statement = select(AppointmentRequest).order_by(
                AppointmentRequest.created_at.desc()
            )
            app_user_id = _app_user_id(rbac_context)
            roles = set(rbac_context.get("roles") or [])
            if "provider" in roles and "admin" not in roles and app_user_id:
                provider_uuid = _uuid_or_none(app_user_id)
                if provider_uuid:
                    statement = statement.where(
                        AppointmentRequest.requested_provider_user_id == provider_uuid
                    )

            appointment_requests = db.execute(statement).scalars().all()
            serialized_requests = [
                serialize_appointment_request(appointment_request)
                for appointment_request in appointment_requests
            ]
            return {
                "appointment_requests": serialized_requests,
                "availability_lookup": [
                    _database_availability_lookup(db, appointment_request)
                    for appointment_request in serialized_requests
                ],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        requests = _placeholder_appointment_requests(rbac_context)
        return {
            "appointment_requests": requests,
            "availability_lookup": [
                _placeholder_availability_lookup(appointment_request)
                for appointment_request in requests
            ],
            "source": "placeholder",
        }


def update_appointment_request_status(payload: dict, rbac_context: dict) -> dict:
    _require_manage_role(rbac_context)
    appointment_request_id = payload.get("id")
    new_status = _normalize_status(payload.get("status"))

    if not appointment_request_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="id is required",
        )

    if SessionLocal is None:
        appointment_request = {
            **PLACEHOLDER_APPOINTMENT_REQUESTS[0],
            "id": appointment_request_id,
            "status": new_status,
            "source": "placeholder",
        }
        return {
            "appointment_request": appointment_request,
            "updated": True,
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            appointment_request = db.execute(
                select(AppointmentRequest).where(
                    AppointmentRequest.id == _required_uuid(appointment_request_id, "id")
                )
            ).scalar_one_or_none()

            if appointment_request is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Appointment request not found",
                )

            appointment_request.status = new_status
            db.commit()
            db.refresh(appointment_request)
            return {
                "appointment_request": serialize_appointment_request(appointment_request),
                "updated": True,
                "source": "postgresql",
            }
    except HTTPException:
        raise
    except SQLAlchemyError:
        appointment_request = {
            **PLACEHOLDER_APPOINTMENT_REQUESTS[0],
            "id": appointment_request_id,
            "status": new_status,
            "source": "placeholder",
        }
        return {
            "appointment_request": appointment_request,
            "updated": True,
            "source": "placeholder",
        }


def serialize_appointment_request(appointment_request: AppointmentRequest) -> dict:
    return {
        "id": str(appointment_request.id),
        "organization_id": str(appointment_request.organization_id) if appointment_request.organization_id else None,
        "patient_name": appointment_request.patient_name,
        "patient_email": appointment_request.patient_email,
        "requested_provider_user_id": (
            str(appointment_request.requested_provider_user_id)
            if appointment_request.requested_provider_user_id
            else None
        ),
        "requested_date": appointment_request.requested_date.isoformat() if appointment_request.requested_date else None,
        "requested_time": appointment_request.requested_time.strftime("%H:%M") if appointment_request.requested_time else None,
        "request_reason": appointment_request.request_reason,
        "status": appointment_request.status,
        "created_by_user_id": str(appointment_request.created_by_user_id) if appointment_request.created_by_user_id else None,
        "created_at": appointment_request.created_at.isoformat() if appointment_request.created_at else None,
        "source": "postgresql",
    }


def _normalize_request_payload(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}
    normalized = {
        "organization_id": payload.get("organization_id") or app_user.get("primary_organization_id"),
        "patient_name": (payload.get("patient_name") or "").strip(),
        "patient_email": (payload.get("patient_email") or "").strip().lower() or None,
        "requested_provider_user_id": payload.get("requested_provider_user_id") or None,
        "requested_date": payload.get("requested_date"),
        "requested_time": payload.get("requested_time"),
        "request_reason": (payload.get("request_reason") or "").strip() or None,
        "created_by_user_id": app_user.get("id"),
    }

    required_fields = ("patient_name", "requested_date", "requested_time")
    missing_fields = [field for field in required_fields if not normalized.get(field)]
    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required appointment request fields: {', '.join(missing_fields)}",
        )

    _parse_date(normalized["requested_date"])
    _parse_time(normalized["requested_time"])
    return normalized


def _placeholder_appointment_requests(rbac_context: dict) -> list[dict]:
    app_user_id = _app_user_id(rbac_context)
    return [
        {
            **appointment_request,
            "created_by_user_id": app_user_id or appointment_request["created_by_user_id"],
        }
        for appointment_request in PLACEHOLDER_APPOINTMENT_REQUESTS
    ]


def _placeholder_appointment_request(payload: dict) -> dict:
    return {
        "id": f"placeholder-appointment-request-{uuid4()}",
        "organization_id": payload.get("organization_id"),
        "patient_name": payload["patient_name"],
        "patient_email": payload.get("patient_email"),
        "requested_provider_user_id": payload.get("requested_provider_user_id"),
        "requested_date": payload["requested_date"],
        "requested_time": payload["requested_time"],
        "request_reason": payload.get("request_reason"),
        "status": "pending",
        "created_by_user_id": payload.get("created_by_user_id"),
        "created_at": None,
        "source": "placeholder",
    }


def _placeholder_availability_lookup(appointment_request: dict) -> dict:
    return {
        "appointment_request_id": appointment_request.get("id"),
        "lookup": "provider_availability_read_only",
        "match_status": "not_connected",
        "matched": False,
        "source": "placeholder",
    }


def _database_availability_lookup(db, appointment_request: dict) -> dict:
    provider_user_id = _uuid_or_none(appointment_request.get("requested_provider_user_id"))
    requested_date = _parse_date(appointment_request.get("requested_date"))
    requested_time = _parse_time(appointment_request.get("requested_time"))

    if not provider_user_id:
        return {
            "appointment_request_id": appointment_request.get("id"),
            "lookup": "provider_availability_read_only",
            "match_status": "provider_not_selected",
            "matched": False,
            "source": "postgresql",
        }

    availability = db.execute(
        select(ProviderAvailability).where(
            ProviderAvailability.provider_user_id == provider_user_id,
            ProviderAvailability.weekday == requested_date.weekday(),
            ProviderAvailability.start_time <= requested_time,
            ProviderAvailability.end_time >= requested_time,
            ProviderAvailability.is_available.is_(True),
        )
    ).scalars().first()

    return {
        "appointment_request_id": appointment_request.get("id"),
        "lookup": "provider_availability_read_only",
        "match_status": "matched" if availability else "no_matching_availability",
        "matched": availability is not None,
        "source": "postgresql",
    }


def _require_manage_role(rbac_context: dict) -> None:
    if set(rbac_context.get("roles") or []).isdisjoint(MANAGE_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Appointment request management requires admin, provider, or staff role",
        )


def _require_read_role(rbac_context: dict) -> None:
    if set(rbac_context.get("roles") or []).isdisjoint(READ_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Appointment request access requires an app role",
        )


def _normalize_status(value: Optional[str]) -> str:
    normalized_status = (value or "").strip().lower()
    if normalized_status not in SUPPORTED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="status must be pending, confirmed, cancelled, or completed",
        )
    return normalized_status


def _app_user_id(rbac_context: dict) -> Optional[str]:
    return (rbac_context.get("app_user") or {}).get("id")


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="requested_date must use YYYY-MM-DD format",
        )


def _parse_time(value: str) -> time:
    try:
        return time.fromisoformat(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="requested_time must use HH:MM format",
        )


def _uuid_or_none(value: Optional[str]):
    if not value:
        return None
    return _required_uuid(value, "uuid")


def _required_uuid(value: str, field_name: str):
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be a valid UUID",
        )
