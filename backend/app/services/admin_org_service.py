from typing import Optional
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import Organization, Role
from app.db.session import SessionLocal


PLACEHOLDER_ORGANIZATIONS = [
    {
        "id": "placeholder-org-horizon",
        "name": "Horizon Test Organization",
        "slug": "horizon-test",
        "status": "active",
        "source": "placeholder",
    }
]

PLACEHOLDER_ROLES = [
    {
        "id": "placeholder-role-owner",
        "organization_id": None,
        "code": "OWNER",
        "name": "Owner",
        "description": "Independent app owner role placeholder",
        "scope": "platform",
        "source": "placeholder",
    },
    {
        "id": "placeholder-role-admin",
        "organization_id": None,
        "code": "ORG_ADMIN",
        "name": "Organization Admin",
        "description": "Organization admin role placeholder",
        "scope": "organization",
        "source": "placeholder",
    },
]


def list_organizations() -> dict:
    if SessionLocal is None:
        return _placeholder_organizations_response()

    try:
        with SessionLocal() as db:
            organizations = db.execute(
                select(Organization).order_by(Organization.name)
            ).scalars().all()
            return {
                "organizations": [
                    serialize_organization(organization)
                    for organization in organizations
                ],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_organizations_response()


def create_organization(payload: dict) -> dict:
    name = (payload.get("name") or "Test Organization").strip()
    slug = (payload.get("slug") or _slugify(name)).strip()

    if SessionLocal is None:
        return {
            "organization": {
                "id": f"placeholder-org-{uuid4()}",
                "name": name,
                "slug": slug,
                "status": "active",
                "source": "placeholder",
            },
            "created": True,
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            organization = Organization(
                name=name,
                slug=slug,
                status="active",
                metadata_json={"created_from": "admin_org_test"},
            )
            db.add(organization)
            db.commit()
            db.refresh(organization)
            return {
                "organization": serialize_organization(organization),
                "created": True,
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return {
            "organization": {
                "id": f"placeholder-org-{uuid4()}",
                "name": name,
                "slug": slug,
                "status": "active",
                "source": "placeholder",
            },
            "created": True,
            "source": "placeholder",
        }


def list_roles() -> dict:
    if SessionLocal is None:
        return _placeholder_roles_response()

    try:
        with SessionLocal() as db:
            roles = db.execute(select(Role).order_by(Role.name)).scalars().all()
            return {
                "roles": [serialize_role(role) for role in roles],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_roles_response()


def serialize_organization(organization: Organization) -> dict:
    return {
        "id": str(organization.id),
        "base44_id": organization.base44_id,
        "name": organization.name,
        "slug": organization.slug,
        "status": organization.status,
        "source": "postgresql",
    }


def serialize_role(role: Role) -> dict:
    return {
        "id": str(role.id),
        "base44_id": role.base44_id,
        "organization_id": str(role.organization_id) if role.organization_id else None,
        "code": role.code,
        "name": role.name,
        "description": role.description,
        "scope": role.scope,
        "source": "postgresql",
    }


def _placeholder_organizations_response() -> dict:
    return {
        "organizations": PLACEHOLDER_ORGANIZATIONS,
        "source": "placeholder",
    }


def _placeholder_roles_response() -> dict:
    return {
        "roles": PLACEHOLDER_ROLES,
        "source": "placeholder",
    }


def _slugify(value: Optional[str]) -> str:
    slug = "".join(
        character.lower() if character.isalnum() else "-"
        for character in (value or "test-organization")
    ).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "test-organization"
