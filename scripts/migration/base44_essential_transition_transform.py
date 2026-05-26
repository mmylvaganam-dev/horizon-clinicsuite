#!/usr/bin/env python3
"""Create essential Horizon transition files from Base44 exports.

This script does not connect to PostgreSQL and does not import data. It creates
reviewable JSON files for the active operational transition only.
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime
from pathlib import Path


ACTIVE_PRESCRIPTION_STATUSES = {"active", "pending", "sent_to_pharmacy", "draft"}
ACTIVE_APPOINTMENT_STATUSES = {"pending", "confirmed", "scheduled", "booked"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Transform essential Base44 data for Horizon review.")
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not source_dir.exists():
        raise SystemExit(f"Source directory does not exist: {source_dir}")

    source = Base44Source(source_dir)

    users = merge_users(source)
    organizations = merge_organizations(source)
    patients = transform_patients(source.load("Patient"))
    appointments = transform_appointments(
        source.load("Appointment") + source.load("TeleAppointment")
    )
    availability = transform_availability(source.load("TeleProviderAvailability"))
    prescriptions = transform_active_prescriptions(source.load("Prescription"))
    document_metadata = transform_document_metadata(
        source.load("PatientDocument") + source.load("StaffCredentialDocument")
    )

    outputs = {
        "users.horizon_import_review.json": users,
        "organizations.horizon_import_review.json": organizations,
        "patients.horizon_import_review.json": patients,
        "appointments.horizon_import_review.json": appointments,
        "provider_availability.horizon_import_review.json": availability,
        "active_prescriptions.horizon_import_review.json": prescriptions,
        "document_metadata.horizon_import_review.json": document_metadata,
    }

    for filename, records in outputs.items():
        write_json(output_dir / filename, records)

    summary = {
        "status": "review_only_not_imported",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source_dir": str(source_dir),
        "output_dir": str(output_dir),
        "counts": {name: len(records) for name, records in outputs.items()},
        "notes": [
            "No passwords migrated.",
            "All records preserve base44_id where present.",
            "Patient and prescription files require owner review before import.",
            "Document metadata does not upload files.",
            "Historical pharmacy records remain a later migration track.",
        ],
    }
    write_json(output_dir / "essential_transition_summary.json", summary)
    print(json.dumps(summary, indent=2))
    return 0


class Base44Source:
    def __init__(self, source_dir: Path):
        self.source_dir = source_dir
        self.combined_records = self._load_combined_records()

    def load(self, entity: str) -> list[dict]:
        for suffix in (".json", ".csv"):
            path = self.source_dir / f"{entity}{suffix}"
            if path.exists():
                return load_records(path)

        lower = entity.lower()
        plural = f"{lower}s"
        snake_plural = camel_to_snake(entity) + "s"
        for key in (lower, plural, snake_plural):
            records = self.combined_records.get(key)
            if isinstance(records, list):
                return records
        return []

    def _load_combined_records(self) -> dict:
        combined = {}
        for path in self.source_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text())
            except Exception:
                continue
            if isinstance(data, dict) and isinstance(data.get("data"), dict):
                for key, value in data["data"].items():
                    if isinstance(value, list):
                        combined[key] = value
        return combined


def merge_users(source: Base44Source) -> list[dict]:
    seen = {}
    for record in source.load("User") + source.load("StaffProfile"):
        email = normalize_email(record.get("email"))
        if not email:
            continue
        existing = seen.get(email, {})
        merged = {
            **existing,
            "base44_id": existing.get("base44_id") or record.get("id"),
            "email": email,
            "first_name": existing.get("first_name") or record.get("first_name"),
            "last_name": existing.get("last_name") or record.get("last_name"),
            "name": existing.get("name") or record.get("name") or join_name(record.get("first_name"), record.get("last_name")),
            "mobile_number": existing.get("mobile_number") or record.get("mobile_number") or record.get("phone"),
            "specialty_or_program": existing.get("specialty_or_program") or record.get("specialization") or record.get("staff_type"),
            "status": normalize_status(record.get("status")),
            "firebase_uid": None,
            "auth_provider": "firebase_pending_link",
            "metadata_json": {
                "base44_source": "User/StaffProfile",
                "base44_user_id": existing.get("base44_user_id") or record.get("id"),
                "migration_note": "passwords_not_migrated",
            },
        }
        seen[email] = merged
    return sorted(seen.values(), key=lambda item: item["email"])


def merge_organizations(source: Base44Source) -> list[dict]:
    records = source.load("Organization") + source.load("Institution")
    output = []
    seen = set()
    for record in records:
        base44_id = record.get("id")
        name = record.get("name") or record.get("organization_name") or record.get("clinic_name")
        key = base44_id or normalize_key(name)
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(
            {
                "base44_id": base44_id,
                "name": name,
                "slug": slugify(name),
                "status": normalize_status(record.get("status")),
                "metadata_json": {"raw": record},
            }
        )
    return output


def transform_patients(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        status = normalize_status(record.get("status"))
        if status not in {"active", "registered", "walk_in"}:
            continue
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "first_name": record.get("first_name"),
                "last_name": record.get("last_name"),
                "date_of_birth": record.get("date_of_birth"),
                "gender": record.get("gender"),
                "email": normalize_email(record.get("email")),
                "phone": record.get("phone") or record.get("mobile"),
                "phn": record.get("phn"),
                "mrn": record.get("mrn"),
                "status": status,
                "metadata_json": {"raw": record, "review_required": "PHI"},
            }
        )
    return output


def transform_appointments(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        status = normalize_appointment_status(record.get("status"))
        if status not in ACTIVE_APPOINTMENT_STATUSES:
            continue
        when = record.get("scheduled_time") or record.get("start_time") or record.get("date")
        date_part, time_part = split_datetime(when)
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_base44_id": record.get("patient_id") or record.get("emr_patient_id"),
                "patient_name": record.get("patient_name"),
                "patient_email": normalize_email(record.get("patient_email")),
                "provider_base44_id": record.get("provider_id"),
                "requested_date": date_part,
                "requested_time": time_part,
                "request_reason": record.get("patient_notes") or record.get("reason") or record.get("visit_type"),
                "status": status,
                "metadata_json": {"raw": record},
            }
        )
    return output


def transform_availability(records: list[dict]) -> list[dict]:
    return [
        {
            "base44_id": record.get("id"),
            "provider_base44_id": record.get("provider_id"),
            "weekday": record.get("day_of_week") if record.get("day_of_week") is not None else record.get("weekday"),
            "start_time": record.get("start_time"),
            "end_time": record.get("end_time"),
            "timezone": record.get("timezone") or "Asia/Colombo",
            "is_available": record.get("is_active", record.get("is_available", True)),
            "metadata_json": {"raw": record},
        }
        for record in records
    ]


def transform_active_prescriptions(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        status = str(record.get("status") or "active").strip().lower()
        if status not in ACTIVE_PRESCRIPTION_STATUSES:
            continue
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_base44_id": record.get("patient_id"),
                "prescriber_base44_id": record.get("prescriber_id"),
                "drug_name": record.get("drug_name"),
                "strength": record.get("strength"),
                "dosage_form": record.get("dosage_form"),
                "directions": record.get("directions"),
                "quantity": record.get("quantity"),
                "refills": record.get("refills"),
                "status": status,
                "prescribed_date": record.get("prescribed_date"),
                "metadata_json": {"raw": record, "review_required": "clinical_pharmacy"},
            }
        )
    return output


def transform_document_metadata(records: list[dict]) -> list[dict]:
    output = []
    for record in records:
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_base44_id": record.get("patient_ref") or record.get("patient_id"),
                "file_name": record.get("doc_name") or record.get("file_name") or record.get("title") or "base44-document",
                "source_file_ref": record.get("file_ref") or record.get("file_url") or record.get("url"),
                "target_storage_path": f"base44-migration/pending-review/{record.get('id') or 'unknown'}",
                "mime_type": record.get("mime_type"),
                "file_size": record.get("file_size"),
                "metadata_json": {"raw": record, "files_not_uploaded": True},
            }
        )
    return output


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
    return []


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True))


def normalize_email(value) -> str | None:
    if not value:
        return None
    return str(value).strip().lower()


def normalize_status(value) -> str:
    status = str(value or "active").strip().lower()
    if status in {"enabled", "approved", "registered", "walk_in"}:
        return "active"
    if status in {"disabled", "blocked", "deceased"}:
        return "inactive"
    return status


def normalize_appointment_status(value) -> str:
    raw = str(value or "pending").strip().lower()
    if raw in {"booked", "scheduled"}:
        return "confirmed"
    if raw in {"done", "closed"}:
        return "completed"
    if raw not in {"pending", "confirmed", "cancelled", "completed"}:
        return raw
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


def normalize_key(value) -> str | None:
    if not value:
        return None
    return str(value).strip().lower()


def slugify(value) -> str | None:
    if not value:
        return None
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value))
    return "-".join(part for part in slug.split("-") if part)


def camel_to_snake(value: str) -> str:
    output = []
    for index, char in enumerate(value):
        if char.isupper() and index:
            output.append("_")
        output.append(char.lower())
    return "".join(output)


if __name__ == "__main__":
    raise SystemExit(main())
