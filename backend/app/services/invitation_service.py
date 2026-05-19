from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from typing import Optional
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import Invitation
from app.db.session import SessionLocal
from app.services.audit_service import log_audit_event


INVITATION_EXPIRY_DAYS = 7
SUPPORTED_INVITATION_ROLES = ("admin", "provider", "staff", "viewer")

PLACEHOLDER_INVITATIONS = [
    {
        "id": "placeholder-invitation-admin",
        "organization_id": None,
        "invited_email": "invited@example.com",
        "invited_role": "staff",
        "invited_by_user_id": None,
        "status": "pending",
        "token": "placeholder-invitation-token",
        "expires_at": None,
        "created_at": None,
        "accepted_at": None,
        "source": "placeholder",
    }
]


def create_invitation(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}
    invited_email = _normalize_email(payload.get("invited_email"))
    invited_role = _normalize_role(payload.get("invited_role"))

    if not invited_email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="invited_email is required",
        )

    if invited_role not in SUPPORTED_INVITATION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="invited_role must be admin, provider, staff, or viewer",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(days=INVITATION_EXPIRY_DAYS)
    token = token_urlsafe(32)

    if SessionLocal is None:
        invitation = _placeholder_invitation(
            invited_email=invited_email,
            invited_role=invited_role,
            token=token,
            expires_at=expires_at,
            app_user=app_user,
        )
        _log_invitation_created(invitation, app_user)
        return {"invitation": invitation, "created": True, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            invitation = Invitation(
                organization_id=_uuid_or_none(app_user.get("primary_organization_id")),
                invited_email=invited_email,
                invited_role=invited_role,
                invited_by_user_id=_uuid_or_none(app_user.get("id")),
                status="pending",
                token=token,
                expires_at=expires_at,
            )
            db.add(invitation)
            db.commit()
            db.refresh(invitation)
            serialized_invitation = serialize_invitation(invitation)
            _log_invitation_created(serialized_invitation, app_user)
            return {
                "invitation": serialized_invitation,
                "created": True,
                "source": "postgresql",
            }
    except SQLAlchemyError:
        invitation = _placeholder_invitation(
            invited_email=invited_email,
            invited_role=invited_role,
            token=token,
            expires_at=expires_at,
            app_user=app_user,
        )
        _log_invitation_created(invitation, app_user)
        return {"invitation": invitation, "created": True, "source": "placeholder"}


def list_invitations() -> dict:
    if SessionLocal is None:
        return _placeholder_invitations_response()

    try:
        with SessionLocal() as db:
            invitations = db.execute(
                select(Invitation).order_by(Invitation.created_at.desc())
            ).scalars().all()
            return {
                "invitations": [
                    serialize_invitation(invitation) for invitation in invitations
                ],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_invitations_response()


def accept_invitation(payload: dict, firebase_user: dict) -> dict:
    token = (payload.get("token") or "").strip()
    firebase_email = _normalize_email(firebase_user.get("email"))

    if not token:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="token is required",
        )

    if SessionLocal is None:
        invitation = {
            **PLACEHOLDER_INVITATIONS[0],
            "status": "accepted",
            "token": token,
            "invited_email": firebase_email or PLACEHOLDER_INVITATIONS[0]["invited_email"],
            "accepted_at": datetime.now(timezone.utc).isoformat(),
        }
        _log_invitation_accepted(invitation, firebase_user)
        return {
            "invitation": invitation,
            "accepted": True,
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            invitation = db.execute(
                select(Invitation).where(Invitation.token == token)
            ).scalar_one_or_none()

            if invitation is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invitation token not found",
                )

            if invitation.status != "pending":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Invitation is not pending",
                )

            if _is_expired(invitation.expires_at):
                invitation.status = "expired"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail="Invitation has expired",
                )

            if _normalize_email(invitation.invited_email) != firebase_email:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Signed-in user does not match invited email",
                )

            invitation.status = "accepted"
            invitation.accepted_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(invitation)
            serialized_invitation = serialize_invitation(invitation)
            _log_invitation_accepted(serialized_invitation, firebase_user)
            return {
                "invitation": serialized_invitation,
                "accepted": True,
                "source": "postgresql",
            }
    except HTTPException:
        raise
    except SQLAlchemyError:
        invitation = {
            **PLACEHOLDER_INVITATIONS[0],
            "status": "accepted",
            "token": token,
            "invited_email": firebase_email or PLACEHOLDER_INVITATIONS[0]["invited_email"],
            "accepted_at": datetime.now(timezone.utc).isoformat(),
        }
        _log_invitation_accepted(invitation, firebase_user)
        return {
            "invitation": invitation,
            "accepted": True,
            "source": "placeholder",
        }


def serialize_invitation(invitation: Invitation) -> dict:
    return {
        "id": str(invitation.id),
        "organization_id": str(invitation.organization_id) if invitation.organization_id else None,
        "invited_email": invitation.invited_email,
        "invited_role": invitation.invited_role,
        "invited_by_user_id": (
            str(invitation.invited_by_user_id) if invitation.invited_by_user_id else None
        ),
        "status": invitation.status,
        "token": invitation.token,
        "expires_at": invitation.expires_at.isoformat() if invitation.expires_at else None,
        "created_at": invitation.created_at.isoformat() if invitation.created_at else None,
        "accepted_at": invitation.accepted_at.isoformat() if invitation.accepted_at else None,
        "source": "postgresql",
    }


def _placeholder_invitations_response() -> dict:
    return {
        "invitations": PLACEHOLDER_INVITATIONS,
        "source": "placeholder",
    }


def _placeholder_invitation(
    invited_email: str,
    invited_role: str,
    token: str,
    expires_at: datetime,
    app_user: dict,
) -> dict:
    return {
        "id": f"placeholder-invitation-{uuid4()}",
        "organization_id": app_user.get("primary_organization_id"),
        "invited_email": invited_email,
        "invited_role": invited_role,
        "invited_by_user_id": app_user.get("id"),
        "status": "pending",
        "token": token,
        "expires_at": expires_at.isoformat(),
        "created_at": None,
        "accepted_at": None,
        "source": "placeholder",
    }


def _normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()


def _normalize_role(role: Optional[str]) -> str:
    return (role or "").strip().lower()


def _is_expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)


def _uuid_or_none(value: Optional[str]):
    if not value:
        return None
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _log_invitation_created(invitation: dict, app_user: dict) -> None:
    log_audit_event(
        action_type="invitation_created",
        resource_type="invitation",
        resource_id=invitation.get("id"),
        organization_id=invitation.get("organization_id"),
        user_id=app_user.get("id"),
        metadata_json={
            "invited_email": invitation.get("invited_email"),
            "invited_role": invitation.get("invited_role"),
            "source": invitation.get("source"),
        },
    )


def _log_invitation_accepted(invitation: dict, firebase_user: dict) -> None:
    log_audit_event(
        action_type="invitation_accepted",
        resource_type="invitation",
        resource_id=invitation.get("id"),
        organization_id=invitation.get("organization_id"),
        user_id=None,
        metadata_json={
            "invited_email": invitation.get("invited_email"),
            "accepted_by_firebase_uid": firebase_user.get("uid"),
            "source": invitation.get("source"),
        },
    )
