# Base44 Live Data Export Instructions

Status: read-only export preparation

## Finding

The repository does not contain a complete "download all raw Base44 data" UI.

Existing export/backup options are useful but incomplete:

- `src/components/admin/DataExportPanel.jsx` exports only selected report fields for a small set of entities: patients, appointments, pharmacy sales, prescriptions, staff users, and invoices.
- `src/pages/DataExport.jsx` creates approval-style export bundle records, but the generator stores summary metadata and a file reference, not a complete raw archive.
- `backupCompanyToGoogleDrive` and `backupAllCompaniesToGoogleDrive` export only a subset: organizations, patients, appointments, pharmacy sale headers, stock, and invoice headers.
- These backup functions may also delete older Google Drive backup files after keeping the latest copies, so they are not enough for the final permanent archive.

Because Base44 shutdown is close, use the read-only SDK export script below to export each expected entity into one JSON file.

## Required Output Folder

```text
Base44-Final-Backup/
  01_raw_entity_exports/
```

## Required Environment Values

The script needs:

```bash
BASE44_API_BASE_URL
BASE44_APP_ID
BASE44_ACCESS_TOKEN
```

Use:

```bash
BASE44_API_BASE_URL=https://base44.app
```

Use an admin/platform-owner Base44 session token. Do not paste the token into chat. Do not commit it.

## Exact Cloud Shell Steps

From the repository:

```bash
cd ~/horizon-clinicsuite
git checkout migration/remove-base44-backend
git pull origin migration/remove-base44-backend
```

Create backup folders:

```bash
mkdir -p Base44-Final-Backup/01_raw_entity_exports
mkdir -p Base44-Final-Backup/09_validation_counts
```

Set the Base44 values securely in the shell:

```bash
export BASE44_APP_ID="your-base44-app-id"
export BASE44_API_BASE_URL="https://base44.app"
export BASE44_ACCESS_TOKEN="your-current-base44-access-token"
```

Run the pharmacy/medical-centre export first:

```bash
node scripts/migration/base44_live_entity_export.mjs \
  --checklist docs/migration/BASE44_PHARMACY_ENTITY_EXPORT_CHECKLIST.csv \
  --output-dir Base44-Final-Backup/01_raw_entity_exports
```

Then inventory and validate:

```bash
python3 scripts/migration/base44_pharmacy_backup_inventory.py \
  --backup-dir Base44-Final-Backup \
  --checklist docs/migration/BASE44_PHARMACY_ENTITY_EXPORT_CHECKLIST.csv \
  --output-dir Base44-Final-Backup/09_validation_counts
```

For a broader full-app archive, run the same exporter with:

```bash
node scripts/migration/base44_live_entity_export.mjs \
  --checklist docs/migration/BASE44_FULL_ENTITY_EXPORT_CHECKLIST.csv \
  --output-dir Base44-Final-Backup/01_raw_entity_exports
```

## What The Script Does

- Reads entity names from the checklist CSV.
- Calls `base44.entities[Entity].list()` in read-only mode.
- Writes one JSON file per entity.
- Writes `__export_manifest.json`.
- Writes `__export_errors.json` for entities that fail or do not exist.
- Validates the Base44 API URL before attempting entity export.
- Does not call create, update, or delete.
- Does not import into Horizon.

## If Live API Export Still Fails

External SDK export is only possible if the Base44 token has enough permission to read the entities. Base44 service-role export is only available inside Base44-hosted backend functions, not from Cloud Shell. If user-token export fails with authorization errors, use one of these fallback paths:

1. Run the existing Base44 Google Drive backup functions and download every backup JSON.
2. Use the Base44 app's partial CSV/PDF export pages for immediately visible report data.
3. Ask Base44 support for a full app data export before shutdown.
4. Keep screenshots of all Base44 list/report counts and export pages as validation evidence.

## Validation Rule

Do not consider the backup complete until:

- Every required entity has a JSON export or an owner-approved explanation.
- Base44 screen/report counts are written into `BASE44_PHARMACY_COUNT_VALIDATION_TEMPLATE.csv`.
- Exported JSON record counts match Base44 counts.
- Missing entity report is reviewed.
- Raw archive is copied to at least two safe storage locations.
