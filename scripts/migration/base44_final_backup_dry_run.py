#!/usr/bin/env python3
"""Create Horizon import-review files from final Base44 combined JSON backups.

This is a dry-run only tool. It reads local Base44 JSON exports, writes
reviewable Horizon-shaped JSON files, and never connects to Base44, Firebase,
PostgreSQL, or any production system.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ENTITY_OUTPUTS = {
    "CompanyProfile": "companies_review.json",
    "Organization": "organizations_review.json",
    "User": "users_review.json",
    "StaffProfile": "staff_profiles_review.json",
    "Role": "roles_review.json",
    "UserRole": "user_roles_review.json",
    "Patient": "patients_review_phi.json",
    "Appointment": "appointments_review_phi.json",
    "TeleAppointment": "tele_appointments_review_phi.json",
    "Prescription": "prescriptions_review_phi.json",
    "PharmacyStock": "pharmacy_stock_review.json",
    "PharmacySaleHeader": "pharmacy_sale_headers_review.json",
    "PharmacySale": "pharmacy_sales_review.json",
    "PharmacySaleItem": "pharmacy_sale_items_review.json",
    "PatientDocument": "patient_document_metadata_review_phi.json",
}

HIGH_RISK_ENTITIES = {
    "Patient",
    "Appointment",
    "TeleAppointment",
    "Prescription",
    "PharmacySaleHeader",
    "PharmacySale",
    "PharmacySaleItem",
    "PatientDocument",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Dry-run final Base44 backup import mapping.")
    parser.add_argument(
        "--source-dir",
        default="Base44-Final-Backup/01_raw_entity_exports",
        help="Folder containing combined Base44 JSON export files.",
    )
    parser.add_argument(
        "--output-dir",
        default="Base44-Final-Backup/10_horizon_import_ready",
        help="Folder for dry-run Horizon review outputs.",
    )
    parser.add_argument(
        "--report",
        default="docs/migration/BASE44_TO_HORIZON_IMPORT_DRY_RUN_REPORT.md",
        help="Markdown report path to write/update.",
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)
    report_path = Path(args.report)

    if not source_dir.exists():
        raise SystemExit(f"Source directory does not exist: {source_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    exports = load_combined_exports(source_dir)
    if not exports:
        raise SystemExit(f"No combined Base44 JSON exports found in {source_dir}")

    source_records = collect_entity_records(exports)
    outputs, validation = build_outputs(source_records)

    written = {}
    for entity, records in outputs.items():
        path = output_dir / ENTITY_OUTPUTS[entity]
        path.write_text(json.dumps(records, indent=2, sort_keys=True))
        written[entity] = {
            "file": str(path),
            "records": len(records),
        }

    summary = {
        "status": "dry_run_only_no_import",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_dir": str(source_dir),
        "output_dir": str(output_dir),
        "source_files": [item["file_name"] for item in exports],
        "source_entity_counts": {
            entity: len(records)
            for entity, records in sorted(source_records.items())
        },
        "mapped_counts": {
            entity: len(records)
            for entity, records in sorted(outputs.items())
        },
        "written_files": written,
        "validation": validation,
        "safety": {
            "import_performed": False,
            "database_connected": False,
            "firebase_storage_used": False,
            "base44_modified": False,
            "contains_phi": True,
            "requires_owner_review_before_import": True,
        },
    }
    (output_dir / "dry_run_summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True))
    report_path.write_text(render_report(summary))

    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


def load_combined_exports(source_dir: Path) -> list[dict[str, Any]]:
    exports = []
    for path in sorted(source_dir.glob("*.json")):
        if path.name.startswith("__export_"):
            continue
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and isinstance(data.get("data"), dict):
            exports.append(
                {
                    "path": path,
                    "file_name": path.name,
                    "export_date": data.get("export_date"),
                    "app": data.get("app"),
                    "total_entities": data.get("total_entities"),
                    "data": data["data"],
                }
            )
    return exports


def collect_entity_records(exports: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    records_by_entity: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for export in exports:
        source_file = export["file_name"]
        for entity, records in export["data"].items():
            if not isinstance(records, list):
                continue
            for record in records:
                if isinstance(record, dict):
                    copied = dict(record)
                    copied["_base44_export_file"] = source_file
                    copied["_base44_export_app"] = export.get("app")
                    records_by_entity[entity].append(copied)
    return dict(records_by_entity)


def build_outputs(source_records: dict[str, list[dict[str, Any]]]) -> tuple[dict[str, list[dict]], dict[str, Any]]:
    transforms = {
        "CompanyProfile": transform_company_profiles,
        "Organization": transform_organizations,
        "User": transform_users,
        "StaffProfile": transform_staff_profiles,
        "Role": transform_roles,
        "UserRole": transform_user_roles,
        "Patient": transform_patients,
        "Appointment": transform_appointments,
        "TeleAppointment": transform_tele_appointments,
        "Prescription": transform_prescriptions,
        "PharmacyStock": transform_pharmacy_stock,
        "PharmacySaleHeader": transform_pharmacy_sale_headers,
        "PharmacySale": transform_pharmacy_sales,
        "PharmacySaleItem": transform_pharmacy_sale_items,
        "PatientDocument": transform_patient_documents,
    }

    outputs = {}
    validation = {
        "missing_required_fields": defaultdict(Counter),
        "skipped_records": defaultdict(Counter),
        "high_risk_mappings": sorted(HIGH_RISK_ENTITIES),
        "notes": [],
    }

    for entity, transform in transforms.items():
        records = source_records.get(entity, [])
        mapped, issues = transform(records)
        outputs[entity] = mapped
        for field, count in issues.get("missing_required_fields", {}).items():
            validation["missing_required_fields"][entity][field] += count
        for reason, count in issues.get("skipped_records", {}).items():
            validation["skipped_records"][entity][reason] += count

    validation["missing_required_fields"] = {
        entity: dict(counter)
        for entity, counter in validation["missing_required_fields"].items()
    }
    validation["skipped_records"] = {
        entity: dict(counter)
        for entity, counter in validation["skipped_records"].items()
    }
    validation["notes"].append("Dry run preserves raw Base44 records in metadata_json for review.")
    validation["notes"].append("PHI/prescription/patient document outputs are review-only and must not be imported without approval.")
    return outputs, validation


def transform_company_profiles(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        name = first_present(record, "company_legal_name", "name", "company_name")
        add_missing(issues, "name", name)
        output.append(
            {
                "base44_id": record.get("id"),
                "name": name,
                "code": first_present(record, "company_code", "code"),
                "status": normalize_status(record.get("status")),
                "metadata_json": metadata("CompanyProfile", record),
            }
        )
    return output, issues


def transform_organizations(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        name = first_present(record, "name", "organization_name", "clinic_name")
        add_missing(issues, "name", name)
        output.append(
            {
                "base44_id": record.get("id"),
                "company_base44_id": record.get("company_id"),
                "name": name,
                "slug": slugify(name),
                "status": normalize_status(record.get("status")),
                "metadata_json": metadata("Organization", record),
            }
        )
    return output, issues


def transform_users(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues, seen = [], empty_issues(), set()
    for record in records:
        email = normalize_email(record.get("email"))
        if not email:
            issues["skipped_records"]["missing_email"] += 1
            continue
        dedupe_key = (email, record.get("_base44_export_file"))
        if dedupe_key in seen:
            issues["skipped_records"]["duplicate_email_in_export_file"] += 1
            continue
        seen.add(dedupe_key)
        output.append(
            {
                "base44_id": record.get("id"),
                "firebase_uid": None,
                "auth_provider": "firebase_pending_link",
                "email": email,
                "first_name": record.get("first_name"),
                "last_name": record.get("last_name"),
                "name": first_present(record, "full_name", "name") or join_name(record.get("first_name"), record.get("last_name")),
                "mobile_number": first_present(record, "mobile_number", "phone"),
                "status": normalize_status(record.get("status")),
                "metadata_json": metadata("User", record),
            }
        )
    return output, issues


def transform_staff_profiles(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "user_base44_id": record.get("user_id"),
                "email": normalize_email(first_present(record, "email", "user_email")),
                "first_name": record.get("first_name"),
                "last_name": record.get("last_name"),
                "name": first_present(record, "full_name", "name") or join_name(record.get("first_name"), record.get("last_name")),
                "mobile_number": first_present(record, "phone", "mobile_number"),
                "specialty_or_program": first_present(record, "specialization", "specialty", "staff_type", "role"),
                "status": normalize_status(record.get("status")),
                "metadata_json": metadata("StaffProfile", record),
            }
        )
    return output, issues


def transform_roles(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        code = normalize_role(first_present(record, "code", "role_code", "name", "role_name"))
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "code": code,
                "name": first_present(record, "name", "role_name") or code.title(),
                "description": record.get("description"),
                "metadata_json": metadata("Role", record),
            }
        )
    return output, issues


def transform_user_roles(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        output.append(
            {
                "base44_id": record.get("id"),
                "user_base44_id": record.get("user_id"),
                "role_base44_id": record.get("role_id"),
                "organization_base44_id": record.get("organization_id"),
                "metadata_json": metadata("UserRole", record),
            }
        )
    return output, issues


def transform_patients(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        add_missing(issues, "base44_id", record.get("id"))
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "first_name": record.get("first_name"),
                "last_name": record.get("last_name"),
                "full_name": first_present(record, "full_name", "name") or join_name(record.get("first_name"), record.get("last_name")),
                "mrn": first_present(record, "mrn", "patient_number", "phn"),
                "date_of_birth": first_present(record, "date_of_birth", "dob"),
                "phone": first_present(record, "phone", "mobile_number"),
                "email": normalize_email(record.get("email")),
                "status": normalize_status(record.get("status")),
                "metadata_json": metadata("Patient", record),
            }
        )
    return output, issues


def transform_appointments(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        date_value, time_value = split_datetime(first_present(record, "appointment_date", "start_time", "scheduled_time"))
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_base44_id": first_present(record, "patient_id", "patient_ref"),
                "provider_base44_id": first_present(record, "provider_id", "doctor_id", "staff_id"),
                "appointment_date": date_value,
                "appointment_time": time_value or record.get("appointment_time"),
                "status": normalize_appointment_status(record.get("status")),
                "reason": first_present(record, "reason", "visit_type", "notes"),
                "metadata_json": metadata("Appointment", record),
            }
        )
    return output, issues


def transform_tele_appointments(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        date_value, time_value = split_datetime(first_present(record, "scheduled_time", "appointment_date", "start_time"))
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_name": record.get("patient_name"),
                "patient_email": normalize_email(record.get("patient_email")),
                "requested_provider_base44_id": first_present(record, "provider_id", "doctor_id"),
                "requested_date": date_value,
                "requested_time": time_value,
                "request_reason": first_present(record, "patient_notes", "visit_type", "reason"),
                "status": normalize_appointment_status(record.get("status")),
                "metadata_json": metadata("TeleAppointment", record),
            }
        )
    return output, issues


def transform_prescriptions(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_base44_id": first_present(record, "patient_id", "patient_ref"),
                "provider_base44_id": first_present(record, "provider_id", "doctor_id", "prescriber_id"),
                "prescription_date": first_present(record, "prescription_date", "created_date"),
                "status": normalize_status(record.get("status")),
                "metadata_json": metadata("Prescription", record),
            }
        )
    return output, issues


def transform_pharmacy_stock(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        item_name = first_present(record, "item_name", "medicine_name", "product_name", "name")
        add_missing(issues, "item_name", item_name)
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "item_name": item_name,
                "sku": first_present(record, "sku", "item_code", "product_code"),
                "batch_number": first_present(record, "batch_number", "batch_no"),
                "quantity": first_present(record, "quantity", "current_stock", "stock_qty", "qty"),
                "unit_price": first_present(record, "unit_price", "selling_price", "price"),
                "expiry_date": first_present(record, "expiry_date", "expiration_date"),
                "metadata_json": metadata("PharmacyStock", record),
            }
        )
    return output, issues


def transform_pharmacy_sale_headers(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        output.append(base_sale_record("PharmacySaleHeader", record))
    return output, issues


def transform_pharmacy_sales(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        output.append(base_sale_record("PharmacySale", record))
    return output, issues


def transform_pharmacy_sale_items(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        output.append(
            {
                "base44_id": record.get("id"),
                "sale_base44_id": first_present(record, "sale_id", "sale_header_id", "header_id"),
                "organization_base44_id": record.get("organization_id"),
                "item_name": first_present(record, "item_name", "medicine_name", "product_name", "name"),
                "quantity": first_present(record, "quantity", "qty"),
                "unit_price": first_present(record, "unit_price", "price"),
                "line_total": first_present(record, "line_total", "total"),
                "metadata_json": metadata("PharmacySaleItem", record),
            }
        )
    return output, issues


def transform_patient_documents(records: list[dict]) -> tuple[list[dict], dict]:
    output, issues = [], empty_issues()
    for record in records:
        file_ref = first_present(record, "file_ref", "file_url", "url")
        output.append(
            {
                "base44_id": record.get("id"),
                "organization_base44_id": record.get("organization_id"),
                "patient_base44_id": first_present(record, "patient_ref", "patient_id"),
                "file_name": first_present(record, "doc_title", "doc_name", "file_name") or "base44-patient-document",
                "storage_path": f"base44-migration/pending-review/{record.get('id') or 'unknown'}",
                "download_url": file_ref,
                "document_type": first_present(record, "doc_category", "document_type"),
                "metadata_json": metadata("PatientDocument", record),
            }
        )
    return output, issues


def base_sale_record(source: str, record: dict) -> dict:
    return {
        "base44_id": record.get("id"),
        "organization_base44_id": record.get("organization_id"),
        "patient_base44_id": first_present(record, "patient_id", "patient_ref"),
        "sale_number": first_present(record, "sale_number", "receipt_number", "invoice_number"),
        "sale_date": first_present(record, "sale_date", "created_date"),
        "subtotal": record.get("subtotal"),
        "tax": first_present(record, "tax", "tax_amount"),
        "total": first_present(record, "total", "total_amount", "grand_total"),
        "payment_method": record.get("payment_method"),
        "status": normalize_status(record.get("status")),
        "metadata_json": metadata(source, record),
    }


def empty_issues() -> dict[str, Counter]:
    return {
        "missing_required_fields": Counter(),
        "skipped_records": Counter(),
    }


def add_missing(issues: dict[str, Counter], field: str, value: Any) -> None:
    if value in (None, ""):
        issues["missing_required_fields"][field] += 1


def metadata(source: str, record: dict) -> dict:
    return {
        "base44_source": source,
        "base44_export_file": record.get("_base44_export_file"),
        "base44_export_app": record.get("_base44_export_app"),
        "raw": record,
    }


def first_present(record: dict, *keys: str) -> Any:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return None


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
    if raw not in {"admin", "provider", "staff", "viewer"}:
        return "staff"
    return raw


def normalize_appointment_status(value: Any) -> str:
    raw = str(value or "pending").strip().lower()
    if raw in {"booked", "scheduled", "approved"}:
        return "confirmed"
    if raw in {"done", "closed", "complete"}:
        return "completed"
    if raw in {"cancelled", "canceled", "void"}:
        return "cancelled"
    if raw not in {"pending", "confirmed", "cancelled", "completed"}:
        return "pending"
    return raw


def split_datetime(value: Any) -> tuple[str | None, str | None]:
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


def join_name(first: Any, last: Any) -> str | None:
    name = " ".join(str(part) for part in [first, last] if part)
    return name or None


def slugify(value: Any) -> str | None:
    if not value:
        return None
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value))
    return "-".join(part for part in slug.split("-") if part)


def render_report(summary: dict[str, Any]) -> str:
    mapped = summary["mapped_counts"]
    validation = summary["validation"]
    lines = [
        "# Base44 To Horizon Import Dry Run Report",
        "",
        "Status: DRY RUN ONLY - NO IMPORT PERFORMED",
        "",
        f"Generated at: {summary['generated_at']}",
        f"Source directory: `{summary['source_dir']}`",
        f"Output directory: `{summary['output_dir']}`",
        "",
        "## Safety Status",
        "",
        "- No PostgreSQL connection was opened.",
        "- No Horizon production data was modified.",
        "- No Firebase Storage upload was performed.",
        "- No Base44 data was modified or deleted.",
        "- Outputs contain PHI and pharmacy/business data and must be stored securely.",
        "",
        "## Source Files",
        "",
    ]
    lines.extend(f"- `{file_name}`" for file_name in summary["source_files"])
    lines.extend([
        "",
        "## Mapped Record Counts",
        "",
        "| Entity | Dry-run records | Output file |",
        "|---|---:|---|",
    ])
    for entity in sorted(mapped):
        output_file = summary["written_files"].get(entity, {}).get("file", "")
        lines.append(f"| {entity} | {mapped[entity]} | `{output_file}` |")
    lines.extend([
        "",
        "## Missing Required Fields",
        "",
    ])
    if validation["missing_required_fields"]:
        for entity, fields in validation["missing_required_fields"].items():
            lines.append(f"### {entity}")
            for field, count in fields.items():
                lines.append(f"- `{field}`: {count}")
    else:
        lines.append("No required-field warnings were recorded by the dry run.")
    lines.extend([
        "",
        "## Skipped Records",
        "",
    ])
    if validation["skipped_records"]:
        for entity, reasons in validation["skipped_records"].items():
            lines.append(f"### {entity}")
            for reason, count in reasons.items():
                lines.append(f"- `{reason}`: {count}")
    else:
        lines.append("No skipped records were recorded by the dry run.")
    lines.extend([
        "",
        "## High-Risk Mappings",
        "",
    ])
    lines.extend(f"- {entity}" for entity in validation["high_risk_mappings"])
    lines.extend([
        "",
        "## Blockers Before Real Import",
        "",
        "- Owner must review all PHI/patient/prescription/pharmacy outputs.",
        "- Target PostgreSQL schemas for patients, prescriptions, pharmacy stock, pharmacy sales, and document metadata must be finalized.",
        "- Firebase Auth user linking must be reviewed by email before creating production users.",
        "- Patient document files must not be moved to Firebase Storage until PHI-approved storage rules are reviewed.",
        "- Rollback and count validation must be approved before any staging or production import.",
        "",
    ])
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
