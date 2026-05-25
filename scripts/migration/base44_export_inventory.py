#!/usr/bin/env python3
"""Inventory copied Base44 export files without importing data."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory Base44 export files.")
    parser.add_argument("--export-dir", required=True, help="Folder containing copied Base44 export files.")
    args = parser.parse_args()

    export_dir = Path(args.export_dir)
    if not export_dir.exists():
        raise SystemExit(f"Export directory does not exist: {export_dir}")

    rows = []
    for path in sorted(p for p in export_dir.iterdir() if p.is_file()):
        if path.name == "SHA256SUMS.txt":
            continue
        rows.append(
            {
                "file": path.name,
                "entity": path.stem,
                "format": path.suffix.lower().lstrip("."),
                "records": count_records(path),
                "sha256": sha256(path),
            }
        )

    print(json.dumps({"export_dir": str(export_dir), "files": rows}, indent=2))
    return 0


def count_records(path: Path) -> int | str:
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text())
        if isinstance(data, list):
            return len(data)
        if isinstance(data, dict) and isinstance(data.get("records"), list):
            return len(data["records"])
        return 1

    if path.suffix.lower() == ".csv":
        with path.open(newline="") as handle:
            return sum(1 for _ in csv.DictReader(handle))

    return "unsupported"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    raise SystemExit(main())
