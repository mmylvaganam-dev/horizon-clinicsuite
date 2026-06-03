#!/usr/bin/env python3
"""Inventory Base44 final pharmacy backup exports.

This script only reads exported JSON/CSV files and writes count/checksum
reports. It does not connect to Base44 or Horizon and does not import data.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory Base44 pharmacy backup exports.")
    parser.add_argument("--backup-dir", required=True, help="Base44-Final-Backup folder.")
    parser.add_argument("--checklist", required=True, help="Expected pharmacy entity checklist CSV.")
    parser.add_argument("--output-dir", required=True, help="Validation output folder.")
    args = parser.parse_args()

    backup_dir = Path(args.backup_dir)
    checklist_path = Path(args.checklist)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not backup_dir.exists():
        raise SystemExit(f"Backup directory does not exist: {backup_dir}")
    if not checklist_path.exists():
        raise SystemExit(f"Checklist does not exist: {checklist_path}")

    expected = read_expected_entities(checklist_path)
    file_rows = inventory_files(backup_dir)
    found_entities = {row["entity"] for row in file_rows}
    expected_entities = {row["entity"] for row in expected}
    missing = [
        row
        for row in expected
        if row["entity"] not in found_entities
    ]

    write_csv(output_dir / "pharmacy_file_inventory.csv", file_rows)
    write_csv(output_dir / "pharmacy_missing_expected_entities.csv", missing)

    summary = {
        "status": "backup_inventory_only_no_import",
        "backup_dir": str(backup_dir),
        "expected_entity_count": len(expected_entities),
        "found_entity_count": len(found_entities),
        "exported_file_count": len(file_rows),
        "missing_expected_entity_count": len(missing),
        "missing_expected_entities": [row["entity"] for row in missing],
    }
    (output_dir / "pharmacy_validation_summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True)
    )

    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


def read_expected_entities(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def inventory_files(backup_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    export_root = backup_dir / "01_raw_entity_exports"
    scan_root = export_root if export_root.exists() else backup_dir

    for path in sorted(item for item in scan_root.rglob("*") if item.is_file()):
        if path.suffix.lower() not in {".json", ".csv"}:
            continue
        rows.extend(inventory_one_file(path, backup_dir))
    return rows


def inventory_one_file(path: Path, backup_dir: Path) -> list[dict[str, Any]]:
    base_row = {
        "file": str(path.relative_to(backup_dir)),
        "format": path.suffix.lower().lstrip("."),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }

    if path.suffix.lower() == ".csv":
        return [
            {
                **base_row,
                "entity": path.stem,
                "record_count": count_csv_records(path),
                "export_shape": "csv_file",
            }
        ]

    try:
        data = json.loads(path.read_text())

        if isinstance(data, dict) and isinstance(data.get("data"), dict):
            company = company_name_from_export(path, data)
            rows: list[dict[str, Any]] = []
            for entity, value in sorted(data["data"].items()):
                rows.append(
                    {
                        **base_row,
                        "entity": entity,
                        "record_count": len(value) if isinstance(value, list) else 1,
                        "export_shape": "combined_base44_data_object",
                        "company_or_export": company,
                    }
                )
            return rows

        if isinstance(data, list):
            return [
                {
                    **base_row,
                    "entity": path.stem,
                    "record_count": len(data),
                    "export_shape": "json_list",
                }
            ]

        if isinstance(data, dict) and isinstance(data.get("records"), list):
            return [
                {
                    **base_row,
                    "entity": path.stem,
                    "record_count": len(data["records"]),
                    "export_shape": "json_records_object",
                }
            ]

        return [
            {
                **base_row,
                "entity": path.stem,
                "record_count": 1,
                "export_shape": "json_object",
            }
        ]
    except Exception as exc:
        return [
            {
                **base_row,
                "entity": path.stem,
                "record_count": f"error:{exc.__class__.__name__}",
                "export_shape": "unreadable",
            }
        ]


def count_csv_records(path: Path) -> int:
    with path.open(newline="") as handle:
        return sum(1 for _ in csv.DictReader(handle))


def company_name_from_export(path: Path, data: dict[str, Any]) -> str:
    app_name = data.get("app")
    if isinstance(app_name, str) and app_name.strip():
        return app_name.strip()
    return path.stem


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fieldnames = sorted({key for row in rows for key in row.keys()})
    if not fieldnames:
        fieldnames = ["entity"]
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    raise SystemExit(main())
