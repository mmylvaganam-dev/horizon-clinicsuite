from typing import Optional
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import OrganizationMember
from app.db.session import SessionLocal


SUPPORTED_MEMBER_ROLES = {"admin", "provider", "staff", "viewer"}
SUPPORTED_MEMBER_STATUSES = {"pending", "active", "inactive"}

PLACEHOLDER_ORG_MEMBERS = [
    {
        "id": "placeholder-org-member-admin",
        "organization_id": "placeholder-org-horizon",
        "user_id": "placeholder-user-admin",
        "role": "admin",
        "status": "active",
        "invited_by_user_id": None,
        "created_at": None,
        "source": "placeholder",
    }
]


def list_org_members(rbac_context: dict) -> dict:
    if SessionLocal is None:
        return _placeholder_members_response()

    try:
        with SessionLocal() as db:
            members = db.execute(
                select(OrganizationMember).order_by(OrganizationMember.created_at.desc())
            ).scalars().all()
            return {
                "members": [serialize_org_member(member) for member in members],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_members_response()


def add_org_member(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}
    normalized_payload = _normalize_add_payload(payload, app_user)

    if SessionLocal is None:
        member = _placeholder_member(normalized_payload)
        return {"member": member, "added": True, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            member = OrganizationMember(
                organization_id=_uuid_or_none(normalized_payload.get("organization_id")),
                user_id=_required_uuid(normalized_payload["user_id"], "user_id"),
                role=normalized_payload["role"],
                status=normalized_payload["status"],
                invited_by_user_id=_uuid_or_none(normalized_payload.get("invited_by_user_id")),
            )
            db.add(member)
            db.commit()
            db.refresh(member)
            return {
                "member": serialize_org_member(member),
                "added": True,
                "source": "postgresql",
            }
    except SQLAlchemyError:
        member = _placeholder_member(normalized_payload)
        return {"member": member, "added": True, "source": "placeholder"}


def update_org_member_status(payload: dict, rbac_context: dict) -> dict:
    member_id = payload.get("id")
    new_status = _normalize_status(payload.get("status"))

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="id is required",
        )

    if SessionLocal is None:
        member = {
            **PLACEHOLDER_ORG_MEMBERS[0],
            "id": member_id,
            "status": new_status,
            "source": "placeholder",
        }
        return {"member": member, "updated": True, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            member = db.execute(
                select(OrganizationMember).where(
                    OrganizationMember.id == _required_uuid(member_id, "id")
                )
            ).scalar_one_or_none()

            if member is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Organization member not found",
                )

            member.status = new_status
            db.commit()
            db.refresh(member)
            return {
                "member": serialize_org_member(member),
                "updated": True,
                "source": "postgresql",
            }
    except HTTPException:
        raise
    except SQLAlchemyError:
        member = {
            **PLACEHOLDER_ORG_MEMBERS[0],
            "id": member_id,
            "status": new_status,
            "source": "placeholder",
        }
        return {"member": member, "updated": True, "source": "placeholder"}


def serialize_org_member(member: OrganizationMember) -> dict:
    return {
        "id": str(member.id),
        "organization_id": str(member.organization_id) if member.organization_id else None,
        "user_id": str(member.user_id),
        "role": member.role,
        "status": member.status,
        "invited_by_user_id": str(member.invited_by_user_id) if member.invited_by_user_id else None,
        "created_at": member.created_at.isoformat() if member.created_at else None,
        "source": "postgresql",
    }


def _normalize_add_payload(payload: dict, app_user: dict) -> dict:
    role = _normalize_role(payload.get("role"))
    member_status = _normalize_status(payload.get("status") or "active")
    user_id = (payload.get("user_id") or "").strip()

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_id is required",
        )

    return {
        "organization_id": payload.get("organization_id") or app_user.get("primary_organization_id"),
        "user_id": user_id,
        "role": role,
        "status": member_status,
        "invited_by_user_id": payload.get("invited_by_user_id") or app_user.get("id"),
    }


def _placeholder_members_response() -> dict:
    return {"members": PLACEHOLDER_ORG_MEMBERS, "source": "placeholder"}


def _placeholder_member(payload: dict) -> dict:
    return {
        "id": f"placeholder-org-member-{uuid4()}",
        "organization_id": payload.get("organization_id") or "placeholder-org-horizon",
        "user_id": payload["user_id"],
        "role": payload["role"],
        "status": payload["status"],
        "invited_by_user_id": payload.get("invited_by_user_id"),
        "created_at": None,
        "source": "placeholder",
    }


def _normalize_role(role: Optional[str]) -> str:
    normalized_role = (role or "").strip().lower()
    if normalized_role not in SUPPORTED_MEMBER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="role must be admin, provider, staff, or viewer",
        )
    return normalized_role


def _normalize_status(member_status: Optional[str]) -> str:
    normalized_status = (member_status or "").strip().lower()
    if normalized_status not in SUPPORTED_MEMBER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="status must be pending, active, or inactive",
        )
    return normalized_status


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
