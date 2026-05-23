import os
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import Organization, OrganizationMember, Role, User, UserRole
from app.db.session import SessionLocal


STAGING_ADMIN_UID = "9q7CTtPwd4V2D8BccgxmYv8hsi1"
STAGING_ADMIN_EMAIL = "firebase-auth-test-1779380527677@example.com"
STAGING_ORG_ID = UUID("99999999-9999-4999-8999-999999999999")
STAGING_ORG_SLUG = "horizon-staging-admin-organization"


def seed_staging_admin_user(seed_token: str | None) -> dict:
    _require_staging_environment()
    _require_seed_token(seed_token)

    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured",
        )

    try:
        with SessionLocal() as db:
            organization = _get_or_create_organization(db)
            user = _get_or_create_user(db, organization)
            role = _get_or_create_admin_role(db, organization)
            user_role = _get_or_create_user_role(db, user, role, organization)
            member = _get_or_create_org_member(db, user, organization)
            db.commit()

            return {
                "seeded": True,
                "environment": _app_environment(),
                "firebase_uid": user.firebase_uid,
                "email": user.email,
                "organization": {
                    "id": str(organization.id),
                    "name": organization.name,
                    "slug": organization.slug,
                    "status": organization.status,
                },
                "role": {
                    "id": str(role.id),
                    "code": role.code,
                    "name": role.name,
                },
                "user_role": {
                    "id": str(user_role.id),
                    "role_code": role.code,
                    "organization_id": str(user_role.organization_id),
                },
                "organization_member": {
                    "id": str(member.id),
                    "role": member.role,
                    "status": member.status,
                },
            }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Staging admin seed failed: {exc.__class__.__name__}",
        ) from exc


def rollback_staging_admin_user(seed_token: str | None) -> dict:
    _require_staging_environment()
    _require_seed_token(seed_token)

    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured",
        )

    try:
        with SessionLocal() as db:
            user = db.execute(
                select(User).where(User.firebase_uid == STAGING_ADMIN_UID)
            ).scalar_one_or_none()
            organization = db.execute(
                select(Organization).where(Organization.slug == STAGING_ORG_SLUG)
            ).scalar_one_or_none()

            if user is None or organization is None:
                return {
                    "rolled_back": True,
                    "admin_assignments_removed": 0,
                    "organization_memberships_removed": 0,
                    "message": "No staging admin assignments found",
                }

            user_roles = db.execute(
                select(UserRole).where(
                    UserRole.user_id == user.id,
                    UserRole.organization_id == organization.id,
                )
            ).scalars().all()
            memberships = db.execute(
                select(OrganizationMember).where(
                    OrganizationMember.user_id == user.id,
                    OrganizationMember.organization_id == organization.id,
                    OrganizationMember.role == "admin",
                )
            ).scalars().all()

            for user_role in user_roles:
                db.delete(user_role)

            for membership in memberships:
                db.delete(membership)

            db.commit()

            return {
                "rolled_back": True,
                "firebase_uid": STAGING_ADMIN_UID,
                "email": STAGING_ADMIN_EMAIL,
                "admin_assignments_removed": len(user_roles),
                "organization_memberships_removed": len(memberships),
                "user_record_preserved": True,
            }
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Staging admin rollback failed: {exc.__class__.__name__}",
        ) from exc


def _app_environment() -> str:
    return (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "development").lower()


def _require_staging_environment() -> None:
    if _app_environment() != "staging":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )


def _require_seed_token(seed_token: str | None) -> None:
    expected_token = os.getenv("STAGING_ADMIN_SEED_TOKEN")
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    if not seed_token or seed_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid staging admin seed token",
        )


def _get_or_create_organization(db) -> Organization:
    organization = db.execute(
        select(Organization).where(Organization.slug == STAGING_ORG_SLUG)
    ).scalar_one_or_none()

    if organization is None:
        organization = Organization(
            id=STAGING_ORG_ID,
            base44_id="staging-admin-org",
            name="Horizon Staging Admin Organization",
            slug=STAGING_ORG_SLUG,
            status="active",
            metadata_json={"staging_seed": True, "non_phi": True},
        )
        db.add(organization)
        db.flush()
    else:
        organization.status = "active"
        organization.metadata_json = {
            **(organization.metadata_json or {}),
            "staging_seed": True,
            "non_phi": True,
        }

    return organization


def _get_or_create_user(db, organization: Organization) -> User:
    user = db.execute(
        select(User).where(User.firebase_uid == STAGING_ADMIN_UID)
    ).scalar_one_or_none()

    if user is None:
        user = db.execute(
            select(User).where(User.email == STAGING_ADMIN_EMAIL)
        ).scalar_one_or_none()

    if user is None:
        user = User(
            id=uuid4(),
            firebase_uid=STAGING_ADMIN_UID,
            auth_provider="firebase",
            primary_organization_id=organization.id,
            email=STAGING_ADMIN_EMAIL,
            first_name="Staging",
            last_name="Admin",
            name="Staging Admin",
            status="active",
            metadata_json={"staging_admin_seed": True, "non_phi": True},
        )
        db.add(user)
        db.flush()
    else:
        user.firebase_uid = STAGING_ADMIN_UID
        user.auth_provider = "firebase"
        user.primary_organization_id = user.primary_organization_id or organization.id
        user.email = STAGING_ADMIN_EMAIL
        user.status = "active"
        user.metadata_json = {
            **(user.metadata_json or {}),
            "staging_admin_seed": True,
            "non_phi": True,
        }

    return user


def _get_or_create_admin_role(db, organization: Organization) -> Role:
    role = db.execute(
        select(Role).where(
            Role.organization_id == organization.id,
            Role.code == "admin",
        )
    ).scalar_one_or_none()

    if role is None:
        role = Role(
            id=uuid4(),
            base44_id="staging-admin-role",
            organization_id=organization.id,
            code="admin",
            name="Admin",
            description="Staging admin role for controlled non-PHI pilot",
            scope="organization",
            permissions={"admin": True},
            metadata_json={"staging_seed": True, "non_phi": True},
        )
        db.add(role)
        db.flush()
    else:
        role.name = "Admin"
        role.description = "Staging admin role for controlled non-PHI pilot"
        role.permissions = {**(role.permissions or {}), "admin": True}
        role.metadata_json = {
            **(role.metadata_json or {}),
            "staging_seed": True,
            "non_phi": True,
        }

    return role


def _get_or_create_user_role(
    db,
    user: User,
    role: Role,
    organization: Organization,
) -> UserRole:
    user_role = db.execute(
        select(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.role_id == role.id,
            UserRole.organization_id == organization.id,
        )
    ).scalar_one_or_none()

    if user_role is None:
        user_role = UserRole(
            id=uuid4(),
            user_id=user.id,
            role_id=role.id,
            organization_id=organization.id,
            assigned_by_user_id=user.id,
            metadata_json={"staging_admin_seed": True, "non_phi": True},
        )
        db.add(user_role)
        db.flush()

    return user_role


def _get_or_create_org_member(
    db,
    user: User,
    organization: Organization,
) -> OrganizationMember:
    member = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user.id,
            OrganizationMember.organization_id == organization.id,
            OrganizationMember.role == "admin",
        )
    ).scalar_one_or_none()

    if member is None:
        member = OrganizationMember(
            id=uuid4(),
            organization_id=organization.id,
            user_id=user.id,
            role="admin",
            status="active",
            invited_by_user_id=user.id,
        )
        db.add(member)
        db.flush()
    else:
        member.status = "active"
        member.invited_by_user_id = member.invited_by_user_id or user.id

    return member
