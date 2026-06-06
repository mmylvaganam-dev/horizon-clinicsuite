#!/usr/bin/env python3
"""Emergency Base44 backup import for Horizon transition tables.

Imports only the minimum operational data needed for same-day transition:
- patient names/basic contact into patients_transition
- pharmacy stock/product names into pharmacy_products

It intentionally does not import clinical notes, attachments, prescriptions,
billing, credit accounts, or full pharmacy history.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.models import PatientTransition, PharmacyProduct  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Emergency Base44 to Horizon transition import.")
    parser.add_argument(
        "--backup-dir",
        default="Base44-Final-Backup/01_raw_entity_exports",
        help="Folder containing Base44 company JSON export files.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Write to Horizon PostgreSQL. Without this flag, dry-run only.",
    )
    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Create transition tables if missing.",
    )
    args = parser.parse_args()

    backup_dir = Path(args.backup_dir)
    files = sorted(backup_dir.glob("*.json"))
    if not files:
        raise SystemExit(f"No JSON files found in {backup_dir}")

    patients = []
    products = []
    for path in files:
        export = _load_json(path)
        data = export.get("data", {}) if isinstance(export, dict) else {}
        company = path.stem
        patients.extend(_extract_patients(data.get("Patient", []), company))
        products.extend(_extract_products(data, company))

    patients = _dedupe(patients, ["base44_id"], ["full_name", "phone"])
    products = _dedupe(products, ["base44_id"], ["name", "sku", "batch_number"])

    summary = {
        "mode": "execute" if args.execute else "dry_run",
        "backup_files": len(files),
        "patients_ready": len(patients),
        "pharmacy_products_ready": len(products),
        "clinical_notes_imported": False,
        "attachments_imported": False,
        "billing_imported": False,
        "full_pharmacy_history_imported": False,
    }

    if not args.execute:
        print(json.dumps(summary, indent=2))
        return 0

    if SessionLocal is None or engine is None:
        raise SystemExit("Database is not configured. Set HCS_DATABASE_URL in this environment.")

    if args.create_tables:
        PatientTransition.__table__.create(bind=engine, checkfirst=True)
        PharmacyProduct.__table__.create(bind=engine, checkfirst=True)

    with SessionLocal() as db:
        patient_created = _insert_patients(db, patients)
        product_created = _insert_products(db, products)
        db.commit()

    summary.update(
        {
            "patients_inserted": patient_created,
            "pharmacy_products_inserted": product_created,
            "status": "emergency_transition_import_complete",
        }
    )
    print(json.dumps(summary, indent=2))
    return 0


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _extract_patients(records: list[dict[str, Any]], company: str) -> list[dict[str, Any]]:
    patients = []
    for record in records or []:
        full_name = _first(
            record,
            "full_name",
            "patient_name",
            "name",
            "display_name",
            "first_name",
        )
        if not full_name:
            first = _first(record, "first_name", "given_name")
            last = _first(record, "last_name", "family_name", "surname")
            full_name = " ".join(part for part in [first, last] if part).strip()
        if not full_name:
            continue

        patients.append(
            {
                "base44_id": str(_first(record, "id", "_id", "base44_id") or ""),
                "full_name": str(full_name).strip(),
                "date_of_birth": _date_or_none(_first(record, "date_of_birth", "dob", "birth_date")),
                "gender": _clean(_first(record, "gender", "sex")),
                "phone": _clean(_first(record, "phone", "mobile", "mobile_number", "contact_number")),
                "email": _clean(_first(record, "email", "email_address")),
                "address": _clean(_first(record, "address", "home_address")),
                "metadata_json": {"source_company_export": company},
            }
        )
    return patients


def _extract_products(data: dict[str, Any], company: str) -> list[dict[str, Any]]:
    products = []
    for entity in ["PharmacyStock", "DrugCatalog", "WholesaleProduct", "PharmacySaleItem"]:
        for record in data.get(entity, []) or []:
            name = _first(
                record,
                "name",
                "product_name",
                "medicine_name",
                "drug_name",
                "item_name",
                "description",
            )
            if not name:
                continue

            products.append(
                {
                    "base44_id": str(_first(record, "id", "_id", "base44_id") or ""),
                    "name": str(name).strip(),
                    "sku": _clean(_first(record, "sku", "code", "barcode", "item_code", "product_code")),
                    "batch_number": _clean(_first(record, "batch_number", "batch", "lot_number")),
                    "quantity_on_hand": _int_or_zero(
                        _first(record, "quantity_on_hand", "quantity", "stock", "current_stock", "available_quantity")
                    ),
                    "unit_price": _decimal_or_zero(
                        _first(record, "unit_price", "selling_price", "price", "sale_price", "retail_price")
                    ),
                    "metadata_json": {
                        "source_company_export": company,
                        "source_entity": entity,
                    },
                }
            )
    return products


def _insert_patients(db, patients: list[dict[str, Any]]) -> int:
    created = 0
    for item in patients:
        existing = None
        if item.get("base44_id"):
            existing = db.query(PatientTransition).filter(PatientTransition.base44_id == item["base44_id"]).one_or_none()
        if existing is None and item.get("phone"):
            existing = (
                db.query(PatientTransition)
                .filter(PatientTransition.full_name == item["full_name"], PatientTransition.phone == item["phone"])
                .one_or_none()
            )
        if existing is not None:
            continue
        db.add(PatientTransition(status="active", **item))
        created += 1
    return created


def _insert_products(db, products: list[dict[str, Any]]) -> int:
    created = 0
    for item in products:
        existing = None
        if item.get("base44_id"):
            existing = db.query(PharmacyProduct).filter(PharmacyProduct.base44_id == item["base44_id"]).one_or_none()
        if existing is None and item.get("sku"):
            existing = db.query(PharmacyProduct).filter(PharmacyProduct.sku == item["sku"]).first()
        if existing is not None:
            continue
        db.add(PharmacyProduct(status="active", **item))
        created += 1
    return created


def _dedupe(records: list[dict[str, Any]], primary_keys: list[str], fallback_keys: list[str]) -> list[dict[str, Any]]:
    seen = set()
    output = []
    for record in records:
        key_parts = [record.get(key) for key in primary_keys if record.get(key)]
        if not key_parts:
            key_parts = [record.get(key) for key in fallback_keys if record.get(key)]
        key = tuple(str(part).strip().lower() for part in key_parts if part)
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(record)
    return output


def _first(record: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return None


def _clean(value: Any) -> str | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    return text or None


def _date_or_none(value: Any):
    if value in (None, ""):
        return None
    text = str(value).strip()[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _int_or_zero(value: Any) -> int:
    try:
        return max(0, int(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def _decimal_or_zero(value: Any) -> Decimal:
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal("0")


if __name__ == "__main__":
    raise SystemExit(main())
