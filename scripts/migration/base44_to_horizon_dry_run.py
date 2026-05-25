#!/usr/bin/env python3
"""Transform copied Base44 exports into Horizon dry-run files.

This script intentionally does not connect to PostgreSQL and does not import
real PHI. It produces reviewable JSON files and a validation summary.
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime
from pathlib import Path


BLOCKED_REAL_IMPORT = {
    "Patient",
    "PatientDocument",
    "Prescription",
    "PharmacySaleHeader",
    "PharmacySaleItem",
    "CreditSale",
    "CreditMonthlyInvoice",
    "Result",
    "LabResultEntry",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Dry-run Base44 to Horizon migration transform.")
    parser.add_argument("--export-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    export_dir = Path(args.export_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    summary = {
        "status": "dry_run_only",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "export_dir": str(export_dir),
        "output_dir": str(output_dir),
        "transformed": {},
        "blocked": {},
        "warnings": [],
    }

    transforms = {
        "Organization": transform_organizations,
        "Institution": transform_institutions,
        "User": transform_users,
        "StaffProfile": transform_staff_profiles,
        "Role": transform_roles,
        "UserRole": transform_user_roles,
        "PendingInvitation": transform_invitations,
        "TeleProviderAvailability": transform_availability,
        "TeleAppointment": transform_appointment_requests,
        "StaffCredentialDocument": transform_document_metadata,
    }

    for entity, transform in transforms.items():
        records = load_entity(export_dir, entity)
        if records is None:
            continue
        transformed = transform(records)
        write_json(output_dir / f"{entity}.horizon_dry_run.json", transformed)
        summary["transformed"][entity] = len(transformed)

    for entity in sorted(BLOCKED_REAL_IMPORT):
        records = load_entity(export_dir, entity)
        if records is not None:
            summary["blocked"][entity] = {
                "records": len(records),
                "reason": "real import blocked until schema, PHI, and owner review are complete",
            }

    if not summary["transformed"]:
        summary["warnings"].append("No supported dry-run entity exports were found.")

    write_json(output_dir / "validation_summary.json", summary)
    print(json.dumps(summary, indent=2))
    return 0


def load_entity(export_dir: Path, entity: str) -> list[dict] | None:
    for suffix in (".json", ".csv"):
        path = export_dir / f"{entity}{suffix}"
        if path.exists():
            return load_records(path)
    return None


def load_records(path: Path) -> list[dict]:
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text())
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and isinstance(data.get("records"), list):
            return data["records"]
        if isinstance(data, dict):
            return [data]
    if path.suffix.lower() == ".csv":
        with path.open(newline="") as handle:
            return list(csv.DictReader(handle))
    raise ValueError(f"Unsupported export format: {path}")


def transform_organizations(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        name = record.get("name") or record.get("organization_name") or record.get("clinic_name")
        output.append(
            {
                "base44_id": record.get("id"),
                "name": name,
                "slug": slugify(name),
                "status": normalize_status(record.get("status")),
                "metadata_json": {"base44_source": "Organization", "raw": record},
            }
        )
    return output


def transform_institutions(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        output.append(
            {
                "base44_id": record.get("id"),
                "name": record.get("name"),
                "slug": slugify(record.get("name")),
                "status": normalize_status(record.get("status")),
                "metadata_json": {"base44_source": "Institution", "raw": record},
            }
        )
    return output


def transform_users(records: list[dict]) -> list[dict]:
    output = []
    seen = set()
    for record in records:
        email = normalize_email(record.get("email"))
        if not email or email in seen:
            continue
        seen.add(email)
        output.append(
            {
                "base44_id": record.get("id"),
                "firebase_uid": None,
                "auth_provider": "firebase_pending_link",
                "email": email,
                "first_name": record.get("first_name"),
                "last_name": record.get("last_name"),
                "name": record.get("name") or join_name(record.get("first_name"), record.get("last_name")),
                "mobile_number": record.get("mobile_number") or record.get("phone"),
                "status": normalize_status(record.get("status")),
                "metadata_json": {"base44_source": "User", "raw": record},
            }
        )
    return output


def transform_staff_profiles(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        email = normalize_email(record.get("email"))
        output.append(
            {
                "base44_id": record.get("id"),
                "email": email,
                "first_name": record.get("first_name"),
                "last_name": record.get("last_name"),
                "name": join_name(record.get("first_name"), record.get("last_name")),
                "mobile_number": record.get("phone"),
                "specialty_or_program": record.get("specialization") or record.get("staff_type"),
                "status": normalize_status(record.get("status")),
                "metadata_json": {"base44_source": "StaffProfile", "raw": record},
            }
        )
    return output


def transform_roles(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        code = normalize_role(record.get("code") or record.get("name"))
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "code": code,
                "name": record.get("name") or code.title(),
                "description": record.get("description"),
                "permissions": record.get("permissions") or {},
                "metadata_json": {"base44_source": "Role", "raw": record},
            }
        )
    return output


def transform_user_roles(records: list[dict]) -> list[dict]:
    return [
        {
            "base44_id": record.get("id"),
            "user_base44_id": record.get("user_id"),
            "role_base44_id": record.get("role_id"),
            "organization_base44_id": record.get("organization_id"),
            "metadata_json": {"base44_source": "UserRole", "raw": record},
        }
        for record in records
    ]


def transform_invitations(records: list[dict]) -> list[dict]:
    return [
        {
            "base44_id": record.get("id"),
            "organization_base44_id": record.get("organization_id"),
            "invited_email": normalize_email(record.get("email")),
            "invited_role": normalize_role(record.get("role")),
            "status": record.get("status") or "pending",
            "metadata_json": {"base44_source": "PendingInvitation", "raw": record},
        }
        for record in records
    ]


def transform_availability(records: list[dict]) -> list[dict]:
    return [
        {
            "base44_id": record.get("id"),
            "provider_base44_id": record.get("provider_id"),
            "weekday": record.get("day_of_week"),
            "start_time": record.get("start_time"),
            "end_time": record.get("end_time"),
            "timezone": record.get("timezone") or "Asia/Colombo",
            "is_available": record.get("is_active", True),
            "metadata_json": {"base44_source": "TeleProviderAvailability", "raw": record},
        }
        for record in records
    ]


def transform_appointment_requests(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        scheduled_time = record.get("scheduled_time")
        requested_date, requested_time = split_datetime(scheduled_time)
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_name": record.get("patient_name"),
                "patient_email": normalize_email(record.get("patient_email")),
                "requested_provider_base44_id": record.get("provider_id"),
                "requested_date": requested_date,
                "requested_time": requested_time,
                "request_reason": record.get("patient_notes") or record.get("visit_type"),
                "status": normalize_appointment_status(record.get("status")),
                "metadata_json": {"base44_source": "TeleAppointment", "raw": record},
            }
        )
    return output


def transform_document_metadata(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        file_ref = record.get("file_ref") or record.get("file_url") or record.get("url")
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "file_name": record.get("doc_name") or record.get("file_name") or "base44-document",
                "storage_path": f"base44-migration/pending-review/{record.get('id') or 'unknown'}",
                "download_url": file_ref,
                "mime_type": record.get("mime_type"),
                "file_size": record.get("file_size"),
                "metadata_json": {"base44_source": "StaffCredentialDocument", "raw": record},
            }
        )
    return output


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True))


def normalize_email(value) -> str | None:
    if not value:
        return None
    return str(value).strip().lower()


def normalize_status(value) -> str:
    status = (str(value or "active")).strip().lower()
    if status in {"enabled", "approved"}:
        return "active"
    if status in {"disabled", "blocked"}:
        return "inactive"
    return status


def normalize_role(value) -> str:
    raw = (str(value or "viewer")).strip().lower().replace(" ", "_")
    if raw in {"doctor", "physician", "clinician"}:
        return "provider"
    if raw in {"owner", "super_admin", "administrator"}:
        return "admin"
    if raw not in {"admin", "provider", "staff", "viewer"}:
        return "staff"
    return raw


def normalize_appointment_status(value) -> str:
    raw = (str(value or "pending")).strip().lower()
    if raw in {"booked", "scheduled"}:
        return "confirmed"
    if raw in {"done", "closed"}:
        return "completed"
    if raw not in {"pending", "confirmed", "cancelled", "completed"}:
        return "pending"
    return raw


def split_datetime(value) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    text = str(value)
    if "T" in text:
        date_part, time_part = text.split("T", 1)
        return date_part[:10], time_part[:5]
    if " " in text:
        date_part, time_part = text.split(" ", 1)
        return date_part[:10], time_part[:5]
    return text[:10], None


def join_name(first, last) -> str | None:
    name = " ".join(part for part in [first, last] if part)
    return name or None


def slugify(value) -> str | None:
    if not value:
        return None
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value))
    return "-".join(part for part in slug.split("-") if part)


if __name__ == "__main__":
    raise SystemExit(main())
