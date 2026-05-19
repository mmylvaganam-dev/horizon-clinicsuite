from datetime import time
from typing import Optional
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import ProviderAvailability
from app.db.session import SessionLocal


PLACEHOLDER_AVAILABILITY = [
    {
        "id": "placeholder-availability-monday",
        "provider_user_id": "placeholder-provider-user",
        "organization_id": None,
        "weekday": 1,
        "start_time": "09:00",
        "end_time": "17:00",
        "timezone": "America/Toronto",
        "is_available": True,
        "created_at": None,
        "source": "placeholder",
    }
]


def create_availability(payload: dict, rbac_context: dict) -> dict:
    normalized_payload = _normalize_payload(payload, rbac_context)
    _require_can_manage_provider(normalized_payload["provider_user_id"], rbac_context)

    if SessionLocal is None:
        availability = _placeholder_availability(normalized_payload)
        return {"availability": availability, "created": True, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            availability = ProviderAvailability(
                provider_user_id=_required_uuid(normalized_payload["provider_user_id"], "provider_user_id"),
                organization_id=_uuid_or_none(normalized_payload.get("organization_id")),
                weekday=normalized_payload["weekday"],
                start_time=_parse_time(normalized_payload["start_time"], "start_time"),
                end_time=_parse_time(normalized_payload["end_time"], "end_time"),
                timezone=normalized_payload["timezone"],
                is_available=normalized_payload["is_available"],
            )
            db.add(availability)
            db.commit()
            db.refresh(availability)
            return {
                "availability": serialize_availability(availability),
                "created": True,
                "source": "postgresql",
            }
    except SQLAlchemyError:
        availability = _placeholder_availability(normalized_payload)
        return {"availability": availability, "created": True, "source": "placeholder"}


def list_availability(rbac_context: dict) -> dict:
    if SessionLocal is None:
        return _placeholder_availability_response(rbac_context)

    try:
        with SessionLocal() as db:
            statement = select(ProviderAvailability).order_by(
                ProviderAvailability.weekday,
                ProviderAvailability.start_time,
            )
            app_user_id = _app_user_id(rbac_context)
            if not _is_admin(rbac_context) and app_user_id:
                statement = statement.where(ProviderAvailability.provider_user_id == _required_uuid(app_user_id, "provider_user_id"))

            records = db.execute(statement).scalars().all()
            return {
                "availability": [
                    serialize_availability(availability) for availability in records
                ],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_availability_response(rbac_context)


def update_availability(payload: dict, rbac_context: dict) -> dict:
    availability_id = payload.get("id")
    if not availability_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="id is required",
        )

    normalized_payload = _normalize_payload(payload, rbac_context, partial=True)

    if SessionLocal is None:
        provider_user_id = normalized_payload.get("provider_user_id") or _app_user_id(rbac_context)
        _require_can_manage_provider(provider_user_id, rbac_context)
        availability = {
            **PLACEHOLDER_AVAILABILITY[0],
            **{key: value for key, value in normalized_payload.items() if value is not None},
            "id": availability_id,
            "source": "placeholder",
        }
        return {"availability": availability, "updated": True, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            availability = db.execute(
                select(ProviderAvailability).where(ProviderAvailability.id == _required_uuid(availability_id, "id"))
            ).scalar_one_or_none()

            if availability is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Availability record not found",
                )

            _require_can_manage_provider(str(availability.provider_user_id), rbac_context)

            if normalized_payload.get("provider_user_id") is not None:
                _require_can_manage_provider(normalized_payload["provider_user_id"], rbac_context)
                availability.provider_user_id = _required_uuid(normalized_payload["provider_user_id"], "provider_user_id")
            if normalized_payload.get("organization_id") is not None:
                availability.organization_id = _uuid_or_none(normalized_payload.get("organization_id"))
            if normalized_payload.get("weekday") is not None:
                availability.weekday = normalized_payload["weekday"]
            if normalized_payload.get("start_time") is not None:
                availability.start_time = _parse_time(normalized_payload["start_time"], "start_time")
            if normalized_payload.get("end_time") is not None:
                availability.end_time = _parse_time(normalized_payload["end_time"], "end_time")
            if normalized_payload.get("timezone") is not None:
                availability.timezone = normalized_payload["timezone"]
            if normalized_payload.get("is_available") is not None:
                availability.is_available = normalized_payload["is_available"]

            db.commit()
            db.refresh(availability)
            return {
                "availability": serialize_availability(availability),
                "updated": True,
                "source": "postgresql",
            }
    except HTTPException:
        raise
    except SQLAlchemyError:
        provider_user_id = normalized_payload.get("provider_user_id") or _app_user_id(rbac_context)
        _require_can_manage_provider(provider_user_id, rbac_context)
        availability = {
            **PLACEHOLDER_AVAILABILITY[0],
            **{key: value for key, value in normalized_payload.items() if value is not None},
            "id": availability_id,
            "source": "placeholder",
        }
        return {"availability": availability, "updated": True, "source": "placeholder"}


def serialize_availability(availability: ProviderAvailability) -> dict:
    return {
        "id": str(availability.id),
        "provider_user_id": str(availability.provider_user_id),
        "organization_id": str(availability.organization_id) if availability.organization_id else None,
        "weekday": availability.weekday,
        "start_time": availability.start_time.strftime("%H:%M") if availability.start_time else None,
        "end_time": availability.end_time.strftime("%H:%M") if availability.end_time else None,
        "timezone": availability.timezone,
        "is_available": availability.is_available,
        "created_at": availability.created_at.isoformat() if availability.created_at else None,
        "source": "postgresql",
    }


def _normalize_payload(payload: dict, rbac_context: dict, partial: bool = False) -> dict:
    app_user = rbac_context.get("app_user") or {}
    normalized = {
        "provider_user_id": payload.get("provider_user_id") or app_user.get("id"),
        "organization_id": payload.get("organization_id") or app_user.get("primary_organization_id"),
        "weekday": payload.get("weekday"),
        "start_time": payload.get("start_time"),
        "end_time": payload.get("end_time"),
        "timezone": payload.get("timezone") or ("America/Toronto" if not partial else None),
        "is_available": payload.get("is_available"),
    }

    if normalized["is_available"] is None and not partial:
        normalized["is_available"] = True

    if not partial:
        required_fields = ("provider_user_id", "weekday", "start_time", "end_time", "timezone")
        missing_fields = [field for field in required_fields if normalized.get(field) in (None, "")]
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required availability fields: {', '.join(missing_fields)}",
            )

    if normalized.get("weekday") is not None:
        normalized["weekday"] = _parse_weekday(normalized["weekday"])
    if normalized.get("start_time") is not None:
        _parse_time(normalized["start_time"], "start_time")
    if normalized.get("end_time") is not None:
        _parse_time(normalized["end_time"], "end_time")

    return normalized


def _placeholder_availability_response(rbac_context: dict) -> dict:
    app_user_id = _app_user_id(rbac_context)
    availability = [
        {
            **record,
            "provider_user_id": app_user_id or record["provider_user_id"],
        }
        for record in PLACEHOLDER_AVAILABILITY
    ]
    return {"availability": availability, "source": "placeholder"}


def _placeholder_availability(payload: dict) -> dict:
    return {
        "id": f"placeholder-availability-{uuid4()}",
        "provider_user_id": payload["provider_user_id"],
        "organization_id": payload.get("organization_id"),
        "weekday": payload["weekday"],
        "start_time": payload["start_time"],
        "end_time": payload["end_time"],
        "timezone": payload["timezone"],
        "is_available": payload["is_available"],
        "created_at": None,
        "source": "placeholder",
    }


def _require_can_manage_provider(provider_user_id: Optional[str], rbac_context: dict) -> None:
    if _is_admin(rbac_context):
        return

    if "provider" not in set(rbac_context.get("roles") or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Provider availability requires provider or admin role",
        )

    if provider_user_id and provider_user_id != _app_user_id(rbac_context):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Providers can only manage their own availability",
        )


def _is_admin(rbac_context: dict) -> bool:
    return "admin" in set(rbac_context.get("roles") or [])


def _app_user_id(rbac_context: dict) -> Optional[str]:
    return (rbac_context.get("app_user") or {}).get("id")


def _parse_weekday(value) -> int:
    try:
        weekday = int(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="weekday must be an integer from 0 to 6",
        )

    if weekday < 0 or weekday > 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="weekday must be an integer from 0 to 6",
        )
    return weekday


def _parse_time(value: str, field_name: str) -> time:
    try:
        return time.fromisoformat(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must use HH:MM format",
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
