from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import Role, User, UserRole
from app.db.session import SessionLocal
from app.services.protected_profile_service import build_app_user_payload
from app.services.user_link_service import get_or_create_user_from_firebase_in_session


SUPPORTED_ROLES = ("admin", "provider", "staff", "viewer")


def get_rbac_context(firebase_user: dict) -> dict:
    if SessionLocal is None:
        return _placeholder_context(firebase_user)

    try:
        with SessionLocal() as db:
            app_user = get_or_create_user_from_firebase_in_session(db, firebase_user)
            if not app_user:
                return _placeholder_context(firebase_user)

            roles = get_user_role_codes(db, app_user)
            if not roles:
                roles = ["viewer"]

            return {
                "app_user": build_app_user_payload(app_user),
                "roles": roles,
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_context(firebase_user)


def require_any_role(firebase_user: dict, allowed_roles: Iterable[str]) -> dict:
    context = get_rbac_context(firebase_user)
    user_roles = set(context["roles"])
    allowed = {_normalize_role(role) for role in allowed_roles}

    if user_roles.isdisjoint(allowed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have the required role",
        )

    return context


def get_user_role_codes(db, app_user: User) -> list[str]:
    statement = (
        select(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == app_user.id)
    )
    role_codes = db.execute(statement).scalars().all()
    normalized_roles = [
        role
        for role in (_normalize_role(role_code) for role_code in role_codes)
        if role in SUPPORTED_ROLES
    ]
    return sorted(set(normalized_roles))


def _placeholder_context(firebase_user: dict) -> dict:
    return {
        "app_user": None,
        "firebase_user": {
            "uid": firebase_user.get("uid"),
            "email": firebase_user.get("email"),
        },
        "roles": ["viewer"],
        "source": "placeholder",
    }


def _normalize_role(role: Optional[str]) -> str:
    return (role or "").strip().lower()
