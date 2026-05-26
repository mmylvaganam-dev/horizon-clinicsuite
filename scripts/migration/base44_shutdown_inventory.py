#!/usr/bin/env python3
"""Inventory full Base44 shutdown exports without importing data."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory Base44 shutdown exports.")
    parser.add_argument("--export-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    export_dir = Path(args.export_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not export_dir.exists():
        raise SystemExit(f"Export directory does not exist: {export_dir}")

    rows = []
    for path in sorted(p for p in export_dir.rglob("*") if p.is_file()):
        relative = path.relative_to(export_dir)
        rows.append(
            {
                "file": str(relative),
                "entity": path.stem,
                "format": path.suffix.lower().lstrip("."),
                "records": count_records(path),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
        )

    summary = {
        "export_dir": str(export_dir),
        "file_count": len(rows),
        "files": rows,
    }

    (output_dir / "inventory.json").write_text(json.dumps(summary, indent=2))
    write_counts_csv(output_dir / "entity-counts.csv", rows)
    write_checksums(output_dir / "checksums.sha256", rows)

    print(json.dumps(summary, indent=2))
    return 0


def count_records(path: Path) -> int | str:
    try:
        if path.suffix.lower() == ".json":
            data = json.loads(path.read_text())
            if isinstance(data, list):
                return len(data)
            if isinstance(data, dict) and isinstance(data.get("records"), list):
                return len(data["records"])
            if isinstance(data, dict) and isinstance(data.get("data"), dict):
                return count_combined_backup_records(data["data"])
            return 1

        if path.suffix.lower() == ".csv":
            with path.open(newline="") as handle:
                return sum(1 for _ in csv.DictReader(handle))
    except Exception as exc:
        return f"error:{exc.__class__.__name__}"

    return "unsupported"


def count_combined_backup_records(data: dict) -> dict:
    return {
        key: len(value)
        for key, value in data.items()
        if isinstance(value, list)
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_counts_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["entity", "file", "format", "records", "bytes", "sha256"],
        )
        writer.writeheader()
        writer.writerows(rows)


def write_checksums(path: Path, rows: list[dict]) -> None:
    path.write_text(
        "".join(f"{row['sha256']}  {row['file']}\n" for row in rows)
    )


if __name__ == "__main__":
    raise SystemExit(main())
