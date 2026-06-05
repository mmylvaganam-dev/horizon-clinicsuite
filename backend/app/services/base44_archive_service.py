import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status


ARCHIVE_STORAGE_DIR = Path(
    os.getenv("BASE44_ARCHIVE_STORAGE_DIR", "/tmp/horizon-base44-archives")
)

SEARCHABLE_ENTITIES = {
    "users": "User",
    "organizations": "Organization",
    "patients": "Patient",
    "appointments": "Appointment",
    "teleappointments": "TeleAppointment",
    "prescriptions": "Prescription",
    "pharmacy_sales": "PharmacySale",
    "pharmacy_sale_headers": "PharmacySaleHeader",
    "pharmacy_sale_items": "PharmacySaleItem",
    "pharmacy_stock": "PharmacyStock",
    "invoices": "Invoice",
    "invoice_headers": "InvoiceHeader",
    "invoice_lines": "InvoiceLine",
    "patient_documents": "PatientDocument",
}


def save_base44_archive(file_name: str, content: str, context: dict) -> dict:
    _require_admin_context(context)
    archive = _parse_archive(content)
    archive_id = _archive_id(file_name, content)
    path = _archive_path(archive_id)
    ARCHIVE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(archive, separators=(",", ":"), ensure_ascii=False))

    return {
        "uploaded": True,
        "archive_id": archive_id,
        "file_name": file_name,
        "app": archive.get("app"),
        "export_date": archive.get("export_date"),
        "entity_counts": _entity_counts(archive),
        "storage": {
            "provider": "local_configured_path",
            "persistent": False,
            "path": str(path),
        },
        "safety": _safety_payload(),
    }


def list_base44_archives(context: dict) -> dict:
    _require_admin_context(context)
    ARCHIVE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    archives = []

    for path in sorted(ARCHIVE_STORAGE_DIR.glob("*.json")):
        try:
            archive = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        archives.append(
            {
                "archive_id": path.stem,
                "app": archive.get("app"),
                "export_date": archive.get("export_date"),
                "entity_counts": _entity_counts(archive),
                "file_size": path.stat().st_size,
            }
        )

    return {
        "archives": archives,
        "count": len(archives),
        "storage": {
            "provider": "local_configured_path",
            "persistent": False,
            "directory": str(ARCHIVE_STORAGE_DIR),
        },
        "safety": _safety_payload(),
    }


def search_base44_archive(
    archive_id: str,
    entity: str,
    query: str,
    limit: int,
    context: dict,
) -> dict:
    _require_admin_context(context)
    normalized_entity = _normalize_entity(entity)
    normalized_query = (query or "").strip().lower()
    safe_limit = max(1, min(limit or 25, 100))

    archive = _load_archive(archive_id)
    records = archive.get("data", {}).get(normalized_entity, [])
    if not isinstance(records, list):
        records = []

    matches = []
    for record in records:
        if not isinstance(record, dict):
            continue
        if normalized_query and normalized_query not in _search_text(record):
            continue
        matches.append(_summarize_record(normalized_entity, record))
        if len(matches) >= safe_limit:
            break

    return {
        "archive_id": archive_id,
        "entity": normalized_entity,
        "query": query,
        "returned": len(matches),
        "total_entity_records": len(records),
        "results": matches,
        "safety": _safety_payload(),
    }


def _parse_archive(content: str) -> dict:
    try:
        archive = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not valid JSON",
        ) from exc

    if not isinstance(archive, dict) or not isinstance(archive.get("data"), dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded JSON is not a combined Base44 export",
        )

    return archive


def _archive_id(file_name: str, content: str) -> str:
    safe_name = "".join(
        char.lower() if char.isalnum() else "-"
        for char in Path(file_name).stem
    ).strip("-")
    safe_name = "-".join(part for part in safe_name.split("-") if part)[:80]
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()[:12]
    return f"{safe_name or 'base44-archive'}-{digest}"


def _archive_path(archive_id: str) -> Path:
    safe_id = "".join(
        char if char.isalnum() or char in {"-", "_"} else "-"
        for char in archive_id
    )
    return ARCHIVE_STORAGE_DIR / f"{safe_id}.json"


def _load_archive(archive_id: str) -> dict:
    path = _archive_path(archive_id)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base44 archive not found",
        )

    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored Base44 archive could not be read",
        ) from exc


def _entity_counts(archive: dict) -> dict:
    data = archive.get("data", {})
    if not isinstance(data, dict):
        return {}
    return {
        entity: len(records)
        for entity, records in sorted(data.items())
        if isinstance(records, list)
    }


def _normalize_entity(entity: str) -> str:
    key = (entity or "").strip()
    lowered = key.lower()
    if key in SEARCHABLE_ENTITIES.values():
        return key
    if lowered in SEARCHABLE_ENTITIES:
        return SEARCHABLE_ENTITIES[lowered]
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported Base44 archive entity",
    )


def _search_text(record: dict) -> str:
    values = []
    for key, value in record.items():
        if key.startswith("_"):
            continue
        if isinstance(value, (str, int, float, bool)) or value is None:
            values.append(str(value or ""))
    return " ".join(values).lower()


def _summarize_record(entity: str, record: dict) -> dict:
    base = {
        "entity": entity,
        "base44_id": record.get("id"),
        "created_date": record.get("created_date"),
        "updated_date": record.get("updated_date"),
    }

    if entity == "Patient":
        base.update({
            "name": _first(record, "full_name", "name") or _join_name(record),
            "email": record.get("email"),
            "phone": _first(record, "phone", "mobile_number"),
            "mrn": _first(record, "mrn", "patient_number", "phn"),
            "status": record.get("status"),
        })
    elif entity in {"Appointment", "TeleAppointment"}:
        base.update({
            "patient_name": _first(record, "patient_name", "full_name", "name"),
            "patient_id": _first(record, "patient_id", "patient_ref"),
            "date": _first(record, "appointment_date", "scheduled_time", "start_time"),
            "provider_id": _first(record, "provider_id", "doctor_id", "staff_id"),
            "status": record.get("status"),
            "reason": _first(record, "reason", "visit_type", "notes"),
        })
    elif entity == "Prescription":
        base.update({
            "patient_id": _first(record, "patient_id", "patient_ref"),
            "provider_id": _first(record, "provider_id", "doctor_id", "prescriber_id"),
            "date": _first(record, "prescription_date", "created_date"),
            "status": record.get("status"),
        })
    elif entity in {"PharmacySale", "PharmacySaleHeader"}:
        base.update({
            "sale_number": _first(record, "sale_number", "receipt_number", "invoice_number"),
            "sale_date": _first(record, "sale_date", "created_date"),
            "patient_id": _first(record, "patient_id", "patient_ref"),
            "total": _first(record, "total", "total_amount", "grand_total"),
            "status": record.get("status"),
        })
    elif entity in {"PharmacyStock", "PharmacySaleItem"}:
        base.update({
            "item_name": _first(record, "item_name", "medicine_name", "product_name", "name"),
            "sku": _first(record, "sku", "item_code", "product_code"),
            "quantity": _first(record, "quantity", "current_stock", "stock_qty", "qty"),
            "price": _first(record, "unit_price", "selling_price", "price"),
        })
    elif entity in {"Invoice", "InvoiceHeader", "InvoiceLine"}:
        base.update({
            "invoice_number": _first(record, "invoice_number", "number"),
            "date": _first(record, "invoice_date", "created_date"),
            "total": _first(record, "total", "total_amount", "grand_total"),
            "status": record.get("status"),
        })
    elif entity == "PatientDocument":
        base.update({
            "patient_id": _first(record, "patient_id", "patient_ref"),
            "file_name": _first(record, "doc_title", "doc_name", "file_name"),
            "document_type": _first(record, "doc_category", "document_type"),
            "file_ref_present": bool(_first(record, "file_ref", "file_url", "url")),
        })
    else:
        base.update({
            "name": _first(record, "full_name", "name", "company_legal_name"),
            "email": record.get("email"),
            "status": record.get("status"),
        })

    base["raw_record"] = record
    return base


def _first(record: dict, *keys: str) -> Any:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return None


def _join_name(record: dict) -> str | None:
    parts = [record.get("first_name"), record.get("last_name")]
    name = " ".join(str(part) for part in parts if part)
    return name or None


def _require_admin_context(context: dict) -> None:
    roles = set(context.get("roles", []))
    if "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Base44 archive access requires admin role",
        )


def _safety_payload() -> dict:
    return {
        "read_only": True,
        "base44_modified": False,
        "operational_tables_modified": False,
        "patient_documents_uploaded": False,
        "phi_possible": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
