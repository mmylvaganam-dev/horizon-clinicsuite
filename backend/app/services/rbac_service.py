import os
from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import OrganizationMember, Role, User, UserRole
from app.db.session import SessionLocal
from app.services.protected_profile_service import build_app_user_payload
from app.services.user_link_service import get_or_create_user_from_firebase_in_session


SUPPORTED_ROLES = ("admin", "provider", "staff", "viewer")
STAGING_TEST_EMAIL = "firebase-auth-test-1779380527677@example.com"
STAGING_FALLBACK_ROLES = ("admin", "provider", "staff")


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


def require_any_role(
    firebase_user: dict,
    allowed_roles: Iterable[str],
    *,
    allow_staging_test_user: bool = False,
) -> dict:
    context = get_rbac_context(firebase_user)
    user_roles = set(context["roles"])
    allowed = {_normalize_role(role) for role in allowed_roles}

    if user_roles.isdisjoint(allowed):
        if allow_staging_test_user and _is_staging_test_user(firebase_user, allowed):
            return {
                "app_user": context.get("app_user"),
                "firebase_user": {
                    "uid": firebase_user.get("uid"),
                    "email": firebase_user.get("email"),
                },
                "roles": sorted(allowed.intersection(STAGING_FALLBACK_ROLES)),
                "source": "staging_test_user_fallback",
            }

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have the required role",
        )

    return context


def get_user_role_codes(db, app_user: User) -> list[str]:
    role_values = []

    statement = (
        select(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == app_user.id,
            _organization_scope_filter(UserRole.organization_id, app_user),
        )
    )
    role_values.extend(db.execute(statement).scalars().all())

    member_statement = select(OrganizationMember.role).where(
        OrganizationMember.user_id == app_user.id,
        OrganizationMember.status == "active",
        _organization_scope_filter(OrganizationMember.organization_id, app_user),
    )
    role_values.extend(db.execute(member_statement).scalars().all())

    normalized_roles = [
        role
        for role in (_normalize_role(role_value) for role_value in role_values)
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


def _organization_scope_filter(organization_id_column, app_user: User):
    if app_user.primary_organization_id:
        return or_(
            organization_id_column.is_(None),
            organization_id_column == app_user.primary_organization_id,
        )

    return True


def _is_staging_test_user(firebase_user: dict, allowed_roles: set[str]) -> bool:
    app_env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").lower()
    if app_env != "staging":
        return False

    email = _normalize_email(firebase_user.get("email"))
    if email != STAGING_TEST_EMAIL:
        return False

    return not allowed_roles.isdisjoint(STAGING_FALLBACK_ROLES)


def _normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()
