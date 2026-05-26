# Base44 Shutdown Backup and Transition Plan

Status: shutdown preparation only

Deadline context: Base44 is expected to stop in one week. The first priority is a complete raw archive. Horizon import comes after backup validation.

Do not delete Base44 data. Do not run irreversible imports. Do not treat transformed files as production-ready until owner review is complete.

## Goals

1. Capture a full raw backup of all Base44 data.
2. Export every Base44 entity used by the application.
3. Export or archive all document/file references.
4. Validate record counts and checksums.
5. Prepare Horizon import files for essential active data only.
6. Preserve the raw Base44 archive permanently.
7. Separate immediate operational transition from historical pharmacy migration.

## Base44 Data Location

Base44 data is stored in the Base44 cloud database, not in this GitHub repository. The repo contains:

- Base44 entity definitions in `base44/entities/`.
- Base44 functions in `base44/functions/`.
- Frontend access through `src/api/base44Client.js`.
- Runtime calls such as `base44.entities.Patient.list()` and `base44.functions.invoke(...)`.

The app also contains Google Drive backup/export functions:

- `backupCompanyToGoogleDrive`
- `backupAllCompaniesToGoogleDrive`
- `performBackup`
- `createExportRequest`
- `reviewExportBundle`
- `generateExportBundle`

## Entity Inventory

The repository references 235 Base44 entity names after removing non-entity UI icon false positives. The full checklist is in:

```text
docs/migration/BASE44_FULL_ENTITY_EXPORT_CHECKLIST.csv
```

The explicit schema files under `base44/entities/` include:

```text
CreditMonthlyInvoice
CreditSale
HomeCareReport
HomeCareSchedule
Institution
LabResultEntry
Patient
PendingInvitation
Prescription
PurchaseOrder
Result
RxFavorite
StaffCredentialDocument
StaffProfile
TeleAppointment
TeleConsultationBilling
TelePaymentGatewayConfig
TelePricingConfig
TeleProviderAvailability
TeleProviderTimeOff
TeleSubscription
WholesaleDelivery
WholesaleGRN
WholesaleGRNLine
WholesaleMessage
WholesaleReturn
WholesaleReturnLine
WholesaleSubscription
```

## Backup Folder Structure

Create this folder structure outside Git. Do not commit raw exports.

```text
exports/
  base44-shutdown-archive/
    00_README.txt
    01_raw-full-archive/
      entities/
      documents/
      google-drive-backups/
      screenshots/
    02_validation/
      entity-counts.csv
      checksums.sha256
      inventory.json
    03_essential-operational-transition/
      source/
      horizon-import-format/
      validation/
    04_later-historical-pharmacy/
      source/
      validation/
    05_rollback/
      restore-notes.md
```

## Three Separate Tracks

### 1. Full Archive Backup

Purpose: preserve everything, even if it is not imported now.

Contents:

- All Base44 entity exports.
- All Google Drive backup JSON files.
- All document/file URLs and file references.
- Screenshots of Base44 export pages and counts.
- Checksums for every file.

Output folder:

```text
exports/base44-shutdown-archive/01_raw-full-archive/
```

### 2. Essential Operational Import

Purpose: keep the clinic operational after Base44 stops.

Essential active data:

- users
- staff roles
- organizations/clinics
- patients
- appointments
- active prescriptions
- document metadata

Output folder:

```text
exports/base44-shutdown-archive/03_essential-operational-transition/horizon-import-format/
```

### 3. Later Historical Pharmacy Migration

Purpose: preserve and later reconcile pharmacy/accounting history.

Historical pharmacy data should not be rushed into Horizon. It needs separate reconciliation:

- sale headers
- sale items
- stock
- returns
- credit sales
- wholesale records
- invoices
- payments

Output folder:

```text
exports/base44-shutdown-archive/04_later-historical-pharmacy/
```

## Required Export Files for Essential Transition

Place these files in:

```text
exports/base44-shutdown-archive/03_essential-operational-transition/source/
```

Preferred filenames:

```text
User.json
StaffProfile.json
Organization.json
Institution.json
Patient.json
Appointment.json
TeleAppointment.json
TeleProviderAvailability.json
Prescription.json
PatientDocument.json
StaffCredentialDocument.json
PharmacySaleHeader.json
PharmacySaleItem.json
CreditSale.json
```

If Base44 gives one combined backup JSON, keep it in:

```text
exports/base44-shutdown-archive/01_raw-full-archive/google-drive-backups/
```

Then copy it into the essential source folder for dry-run parsing.

## Validation Rules

- Every exported file must have a SHA256 checksum.
- Every entity must have a count recorded.
- Raw source files must remain unchanged.
- Any transformed Horizon import file must reference `base44_id`.
- No passwords are migrated.
- Documents are not uploaded until Firebase Storage rules are approved.
- Pharmacy totals must be reconciled before historical import.

## Exact Cloud Shell Commands

```bash
cd ~/horizon-clinicsuite
git checkout migration/remove-base44-backend
git pull origin migration/remove-base44-backend

mkdir -p exports/base44-shutdown-archive/01_raw-full-archive/entities
mkdir -p exports/base44-shutdown-archive/01_raw-full-archive/documents
mkdir -p exports/base44-shutdown-archive/01_raw-full-archive/google-drive-backups
mkdir -p exports/base44-shutdown-archive/01_raw-full-archive/screenshots
mkdir -p exports/base44-shutdown-archive/02_validation
mkdir -p exports/base44-shutdown-archive/03_essential-operational-transition/source
mkdir -p exports/base44-shutdown-archive/03_essential-operational-transition/horizon-import-format
mkdir -p exports/base44-shutdown-archive/03_essential-operational-transition/validation
mkdir -p exports/base44-shutdown-archive/04_later-historical-pharmacy/source
mkdir -p exports/base44-shutdown-archive/04_later-historical-pharmacy/validation
mkdir -p exports/base44-shutdown-archive/05_rollback
```

After uploading Base44 exports, inventory them:

```bash
python3 scripts/migration/base44_shutdown_inventory.py \
  --export-dir exports/base44-shutdown-archive/01_raw-full-archive/entities \
  --output-dir exports/base44-shutdown-archive/02_validation
```

Create essential Horizon dry-run files:

```bash
python3 scripts/migration/base44_essential_transition_transform.py \
  --source-dir exports/base44-shutdown-archive/03_essential-operational-transition/source \
  --output-dir exports/base44-shutdown-archive/03_essential-operational-transition/horizon-import-format
```

Review summary:

```bash
cat exports/base44-shutdown-archive/03_essential-operational-transition/horizon-import-format/essential_transition_summary.json
```

Do not import into PostgreSQL until this summary is reviewed.
