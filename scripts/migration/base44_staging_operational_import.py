#!/usr/bin/env python3
"""Import essential Base44 operational data into Horizon staging.

Default mode is dry-run only. Execute mode is intentionally limited to
organizations, users, roles, user_roles, and organization_members. It does not
import patients, prescriptions, pharmacy records, billing records, or documents.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID


SAFE_ROLE_CODES = {"admin", "provider", "staff", "viewer"}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Dry-run or execute a staging-only Base44 operational import."
    )
    parser.add_argument(
        "--input-dir",
        default="Base44-Final-Backup/10_horizon_import_ready",
        help="Folder containing Base44 dry-run review JSON files.",
    )
    parser.add_argument(
        "--manifest-dir",
        default="Base44-Final-Backup/10_horizon_import_ready",
        help="Folder where execution manifests are written.",
    )
    parser.add_argument(
        "--batch-id",
        default=None,
        help="Import batch id. Defaults to a UTC timestamp.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually write to the staging PostgreSQL database.",
    )
    parser.add_argument(
        "--rollback-manifest",
        default=None,
        help="Rollback rows created by a previous execution manifest.",
    )
    parser.add_argument(
        "--confirm-rollback",
        action="store_true",
        help="Required with --rollback-manifest.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    backend_path = repo_root / "backend"
    sys.path.insert(0, str(backend_path))

    if args.rollback_manifest:
        if not args.confirm_rollback:
            raise SystemExit("Rollback requires --confirm-rollback.")
        return rollback(args.rollback_manifest)

    batch_id = args.batch_id or datetime.now(timezone.utc).strftime(
        "base44-operational-%Y%m%d%H%M%S"
    )
    input_dir = Path(args.input_dir)
    manifest_dir = Path(args.manifest_dir)

    if not input_dir.exists():
        raise SystemExit(f"Input directory does not exist: {input_dir}")

    payload = load_import_payload(input_dir)
    plan = build_plan(payload, batch_id)

    if not args.execute:
        print(json.dumps(render_summary(plan, executed=False), indent=2, sort_keys=True))
        return 0

    require_staging_environment()
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifest_dir / f"staging_operational_import_manifest_{batch_id}.json"
    result = execute_import(plan)
    manifest_path.write_text(json.dumps(result["manifest"], indent=2, sort_keys=True))
    result["summary"]["manifest_path"] = str(manifest_path)
    print(json.dumps(result["summary"], indent=2, sort_keys=True))
    return 0


def load_import_payload(input_dir: Path) -> dict[str, list[dict[str, Any]]]:
    files = {
        "organizations": "organizations_review.json",
        "users": "users_review.json",
        "roles": "roles_review.json",
        "user_roles": "user_roles_review.json",
        "staff_profiles": "staff_profiles_review.json",
    }
    payload: dict[str, list[dict[str, Any]]] = {}
    for key, file_name in files.items():
        path = input_dir / file_name
        if not path.exists():
            payload[key] = []
            continue
        data = json.loads(path.read_text())
        if not isinstance(data, list):
            raise SystemExit(f"Expected list in {path}")
        payload[key] = [record for record in data if isinstance(record, dict)]
    return payload


def build_plan(payload: dict[str, list[dict[str, Any]]], batch_id: str) -> dict[str, Any]:
    organizations = dedupe_by_base44_id(payload["organizations"])
    users = dedupe_users(payload["users"])
    roles = dedupe_roles(payload["roles"])
    user_roles = dedupe_user_roles(payload["user_roles"])
    memberships = build_memberships(payload["staff_profiles"])

    excluded = {
        "patients": "PHI blocked",
        "prescriptions": "clinical/pharmacy blocked",
        "clinical_records": "PHI blocked",
        "pharmacy_sales": "pharmacy history blocked",
        "patient_documents": "PHI files blocked",
        "billing_payments": "billing/payment blocked",
    }

    warnings = []
    if not organizations:
        warnings.append("No organizations found in dry-run review files.")
    if not users:
        warnings.append("No users found in dry-run review files.")
    if not roles:
        warnings.append("No Base44 roles found; default Horizon roles will still be ensured per organization.")

    return {
        "batch_id": batch_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "organizations": organizations,
        "users": users,
        "roles": roles,
        "user_roles": user_roles,
        "memberships": memberships,
        "excluded": excluded,
        "warnings": warnings,
    }


def dedupe_by_base44_id(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    fallback = []
    for record in records:
        base44_id = record.get("base44_id")
        if base44_id:
            seen[str(base44_id)] = record
        else:
            fallback.append(record)
    return list(seen.values()) + fallback


def dedupe_users(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_email: dict[str, dict[str, Any]] = {}
    for record in records:
        email = normalize_email(record.get("email"))
        if not email:
            continue
        if email not in by_email:
            copied = dict(record)
            copied["email"] = email
            by_email[email] = copied
    return list(by_email.values())


def dedupe_roles(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: dict[tuple[str | None, str], dict[str, Any]] = {}
    for record in records:
        code = normalize_role(record.get("code"))
        org_base44_id = as_string(record.get("organization_base44_id"))
        key = (org_base44_id, code)
        copied = dict(record)
        copied["code"] = code
        output[key] = copied
    return list(output.values())


def dedupe_user_roles(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: dict[tuple[str | None, str | None, str | None], dict[str, Any]] = {}
    for record in records:
        key = (
            as_string(record.get("user_base44_id")),
            as_string(record.get("role_base44_id")),
            as_string(record.get("organization_base44_id")),
        )
        if not key[0] or not key[1]:
            continue
        output[key] = record
    return list(output.values())


def build_memberships(staff_profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: dict[tuple[str | None, str | None, str | None], dict[str, Any]] = {}
    for profile in staff_profiles:
        user_base44_id = as_string(profile.get("user_base44_id"))
        email = normalize_email(profile.get("email"))
        org_base44_id = as_string(profile.get("organization_base44_id"))
        if not org_base44_id or not (user_base44_id or email):
            continue
        role = normalize_role(profile.get("specialty_or_program"))
        key = (user_base44_id or email, org_base44_id, role)
        output[key] = {
            "user_base44_id": user_base44_id,
            "email": email,
            "organization_base44_id": org_base44_id,
            "role": role,
            "status": normalize_status(profile.get("status")),
            "source": "StaffProfile",
            "metadata_json": profile.get("metadata_json", {}),
        }
    return list(output.values())


def render_summary(plan: dict[str, Any], executed: bool) -> dict[str, Any]:
    return {
        "status": "executed" if executed else "dry_run_only_no_database_write",
        "batch_id": plan["batch_id"],
        "counts": {
            "organizations": len(plan["organizations"]),
            "users": len(plan["users"]),
            "roles": len(plan["roles"]),
            "user_roles": len(plan["user_roles"]),
            "organization_memberships": len(plan["memberships"]),
        },
        "excluded": plan["excluded"],
        "warnings": plan["warnings"],
        "safety": {
            "patients_imported": False,
            "prescriptions_imported": False,
            "pharmacy_history_imported": False,
            "patient_documents_imported": False,
            "billing_imported": False,
        },
    }


def execute_import(plan: dict[str, Any]) -> dict[str, Any]:
    from sqlalchemy.exc import IntegrityError

    from app.db.models import Organization, OrganizationMember, Role, User, UserRole
    from app.db.session import SessionLocal

    if SessionLocal is None:
        raise SystemExit("HCS_DATABASE_URL is not configured.")

    manifest: dict[str, Any] = {
        "batch_id": plan["batch_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_ids": {
            "organizations": [],
            "users": [],
            "roles": [],
            "user_roles": [],
            "organization_members": [],
        },
        "updated_ids": {
            "organizations": [],
            "users": [],
            "roles": [],
        },
    }
    org_by_base44: dict[str, Any] = {}
    user_by_base44: dict[str, Any] = {}
    user_by_email: dict[str, Any] = {}
    role_by_base44: dict[str, Any] = {}
    role_by_org_code: dict[tuple[str | None, str], Any] = {}

    db = SessionLocal()
    try:
        for item in plan["organizations"]:
            org, created = upsert_organization(db, Organization, item, plan["batch_id"])
            remember(manifest, "organizations", org.id, created)
            if org.base44_id:
                org_by_base44[org.base44_id] = org

        db.flush()

        for item in plan["users"]:
            org = org_by_base44.get(as_string(item.get("organization_base44_id")))
            user, created = upsert_user(db, User, item, org, plan["batch_id"])
            remember(manifest, "users", user.id, created)
            if user.base44_id:
                user_by_base44[user.base44_id] = user
            user_by_email[user.email] = user

        db.flush()

        for org in list(org_by_base44.values()) or [None]:
            for role_code in sorted(SAFE_ROLE_CODES):
                role, created = ensure_role(db, Role, org, role_code, None, plan["batch_id"])
                remember(manifest, "roles", role.id, created)
                role_by_org_code[(str(org.id) if org else None, role.code)] = role

        for item in plan["roles"]:
            org = org_by_base44.get(as_string(item.get("organization_base44_id")))
            role, created = ensure_role(db, Role, org, item["code"], item, plan["batch_id"])
            remember(manifest, "roles", role.id, created)
            if item.get("base44_id"):
                role_by_base44[str(item["base44_id"])] = role
            role_by_org_code[(str(org.id) if org else None, role.code)] = role

        db.flush()

        for item in plan["user_roles"]:
            user = user_by_base44.get(as_string(item.get("user_base44_id")))
            role = role_by_base44.get(as_string(item.get("role_base44_id")))
            org = org_by_base44.get(as_string(item.get("organization_base44_id")))
            if not user or not role:
                continue
            created_id = ensure_user_role(db, UserRole, user, role, org, item, plan["batch_id"])
            if created_id:
                manifest["created_ids"]["user_roles"].append(str(created_id))

        for item in plan["memberships"]:
            user = user_by_base44.get(as_string(item.get("user_base44_id"))) or user_by_email.get(
                normalize_email(item.get("email")) or ""
            )
            org = org_by_base44.get(as_string(item.get("organization_base44_id")))
            if not user or not org:
                continue
            role = role_by_org_code.get((str(org.id), item["role"]))
            if role:
                created_id = ensure_user_role(db, UserRole, user, role, org, item, plan["batch_id"])
                if created_id:
                    manifest["created_ids"]["user_roles"].append(str(created_id))
            member_id = ensure_organization_member(db, OrganizationMember, user, org, item)
            if member_id:
                manifest["created_ids"]["organization_members"].append(str(member_id))

        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise SystemExit(f"Import failed on database constraint: {exc}") from exc
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return {
        "summary": {
            **render_summary(plan, executed=True),
            "created_ids": {key: len(value) for key, value in manifest["created_ids"].items()},
            "updated_ids": {key: len(value) for key, value in manifest["updated_ids"].items()},
        },
        "manifest": manifest,
    }


def upsert_organization(db: Any, Organization: Any, item: dict[str, Any], batch_id: str) -> tuple[Any, bool]:
    from sqlalchemy import select

    org = None
    if item.get("base44_id"):
        org = db.execute(
            select(Organization).where(Organization.base44_id == str(item["base44_id"]))
        ).scalar_one_or_none()
    if org is None and item.get("slug"):
        org = db.execute(select(Organization).where(Organization.slug == item["slug"])).scalar_one_or_none()
    metadata = merge_metadata(item.get("metadata_json"), batch_id)
    if org is None:
        org = Organization(
            base44_id=as_string(item.get("base44_id")),
            name=item.get("name") or "Base44 Organization",
            slug=item.get("slug"),
            status=normalize_status(item.get("status")),
            metadata_json=metadata,
        )
        db.add(org)
        db.flush()
        return org, True
    org.name = item.get("name") or org.name
    org.status = normalize_status(item.get("status"))
    org.metadata_json = merge_metadata(org.metadata_json, batch_id, item.get("metadata_json"))
    return org, False


def upsert_user(db: Any, User: Any, item: dict[str, Any], org: Any, batch_id: str) -> tuple[Any, bool]:
    from sqlalchemy import select

    user = None
    if item.get("base44_id"):
        user = db.execute(select(User).where(User.base44_id == str(item["base44_id"]))).scalar_one_or_none()
    if user is None:
        user = db.execute(select(User).where(User.email == item["email"])).scalar_one_or_none()
    if user is None:
        user = User(
            base44_id=as_string(item.get("base44_id")),
            firebase_uid=None,
            auth_provider=item.get("auth_provider") or "firebase_pending_link",
            primary_organization_id=org.id if org else None,
            email=item["email"],
            first_name=item.get("first_name"),
            last_name=item.get("last_name"),
            name=item.get("name"),
            mobile_number=item.get("mobile_number"),
            status=normalize_status(item.get("status")),
            metadata_json=merge_metadata(item.get("metadata_json"), batch_id),
        )
        db.add(user)
        db.flush()
        return user, True
    if item.get("base44_id") and not user.base44_id:
        user.base44_id = str(item["base44_id"])
    if org and not user.primary_organization_id:
        user.primary_organization_id = org.id
    user.first_name = item.get("first_name") or user.first_name
    user.last_name = item.get("last_name") or user.last_name
    user.name = item.get("name") or user.name
    user.mobile_number = item.get("mobile_number") or user.mobile_number
    user.status = normalize_status(item.get("status"))
    user.metadata_json = merge_metadata(user.metadata_json, batch_id, item.get("metadata_json"))
    return user, False


def ensure_role(
    db: Any,
    Role: Any,
    org: Any,
    code: str,
    item: dict[str, Any] | None,
    batch_id: str,
) -> tuple[Any, bool]:
    from sqlalchemy import select

    code = normalize_role(code)
    role = None
    if item and item.get("base44_id"):
        role = db.execute(select(Role).where(Role.base44_id == str(item["base44_id"]))).scalar_one_or_none()
    if role is None:
        role = db.execute(
            select(Role).where(Role.organization_id == (org.id if org else None), Role.code == code)
        ).scalar_one_or_none()
    if role is None:
        role = Role(
            base44_id=as_string(item.get("base44_id")) if item else None,
            organization_id=org.id if org else None,
            code=code,
            name=(item.get("name") if item else None) or code.title(),
            description=(item.get("description") if item else None),
            scope="organization" if org else "global",
            permissions={},
            metadata_json=merge_metadata(item.get("metadata_json") if item else None, batch_id),
        )
        db.add(role)
        db.flush()
        return role, True
    if item and item.get("base44_id") and not role.base44_id:
        role.base44_id = str(item["base44_id"])
    role.name = (item.get("name") if item else None) or role.name
    role.metadata_json = merge_metadata(role.metadata_json, batch_id, item.get("metadata_json") if item else None)
    return role, False


def ensure_user_role(db: Any, UserRole: Any, user: Any, role: Any, org: Any, item: dict[str, Any], batch_id: str) -> UUID | None:
    from sqlalchemy import select

    existing = db.execute(
        select(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.role_id == role.id,
            UserRole.organization_id == (org.id if org else None),
        )
    ).scalar_one_or_none()
    if existing:
        return None
    user_role = UserRole(
        user_id=user.id,
        role_id=role.id,
        organization_id=org.id if org else None,
        metadata_json=merge_metadata(item.get("metadata_json"), batch_id),
    )
    db.add(user_role)
    db.flush()
    return user_role.id


def ensure_organization_member(db: Any, OrganizationMember: Any, user: Any, org: Any, item: dict[str, Any]) -> UUID | None:
    from sqlalchemy import select

    existing = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user.id,
            OrganizationMember.organization_id == org.id,
        )
    ).scalar_one_or_none()
    if existing:
        existing.role = item["role"]
        existing.status = normalize_status(item.get("status"))
        return None
    member = OrganizationMember(
        user_id=user.id,
        organization_id=org.id,
        role=item["role"],
        status=normalize_status(item.get("status")),
    )
    db.add(member)
    db.flush()
    return member.id


def rollback(manifest_path: str) -> int:
    require_staging_environment()

    from app.db.models import Organization, OrganizationMember, Role, User, UserRole
    from app.db.session import SessionLocal

    if SessionLocal is None:
        raise SystemExit("HCS_DATABASE_URL is not configured.")

    manifest = json.loads(Path(manifest_path).read_text())
    created = manifest.get("created_ids", {})
    db = SessionLocal()
    deleted = {}
    try:
        deletion_order = [
            ("organization_members", OrganizationMember),
            ("user_roles", UserRole),
            ("roles", Role),
            ("users", User),
            ("organizations", Organization),
        ]
        for key, model in deletion_order:
            ids = [UUID(value) for value in created.get(key, [])]
            count = 0
            for row_id in ids:
                row = db.get(model, row_id)
                if row is not None:
                    db.delete(row)
                    count += 1
            deleted[key] = count
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print(json.dumps({"status": "rollback_complete", "deleted": deleted}, indent=2, sort_keys=True))
    return 0


def remember(manifest: dict[str, Any], key: str, row_id: UUID, created: bool) -> None:
    bucket = "created_ids" if created else "updated_ids"
    manifest[bucket][key].append(str(row_id))


def merge_metadata(existing: Any, batch_id: str, incoming: Any = None) -> dict[str, Any]:
    metadata = dict(existing or {})
    if incoming:
        metadata["base44_import_review"] = incoming
    metadata["base44_import_batch_id"] = batch_id
    metadata["base44_import_scope"] = "essential_operational_staging"
    metadata["base44_imported_at"] = datetime.now(timezone.utc).isoformat()
    return metadata


def require_staging_environment() -> None:
    app_env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").lower()
    if app_env != "staging":
        raise SystemExit("Execution is blocked unless APP_ENV=staging.")
    if not (os.getenv("HCS_DATABASE_URL") or os.getenv("DATABASE_URL")):
        raise SystemExit("Execution requires HCS_DATABASE_URL or DATABASE_URL.")


def normalize_email(value: Any) -> str | None:
    if not value:
        return None
    return str(value).strip().lower()


def normalize_status(value: Any) -> str:
    status = str(value or "active").strip().lower()
    if status in {"enabled", "approved", "complete", "completed"}:
        return "active"
    if status in {"disabled", "blocked", "void", "deleted"}:
        return "inactive"
    return status


def normalize_role(value: Any) -> str:
    raw = str(value or "viewer").strip().lower().replace(" ", "_")
    if raw in {"doctor", "physician", "clinician"}:
        return "provider"
    if raw in {"owner", "super_admin", "administrator", "app_admin", "platform_owner"}:
        return "admin"
    if raw not in SAFE_ROLE_CODES:
        return "staff"
    return raw


def as_string(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value)


if __name__ == "__main__":
    raise SystemExit(main())
