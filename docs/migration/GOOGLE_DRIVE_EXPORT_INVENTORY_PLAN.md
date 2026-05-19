# Google Drive Export Inventory Plan

This plan defines how to inventory Base44 export and backup files currently stored in Google Drive. It is documentation only and does not modify application code.

Do not access patient data directly yet. The first step is to inventory file metadata and classify export types without opening sensitive records unless an approved privacy-safe review process is in place.

## Expected Base44 Export Types

Base44 exports in Google Drive may include several categories of files:

- CSV exports
- JSON exports
- Uploaded documents
- Images
- Invoices
- Reports

Each file should be inventoried with its Google Drive folder path, file name, file type, export date when available, owner, approximate size, and likely source module or business area.

## Classification Strategy

Classify each export into one of the following groups before choosing a migration destination.

### Structured Data

Structured data includes records that represent application entities and workflows.

Examples:

- Patients
- Appointments
- Payments
- Sales
- Users
- Roles
- Pharmacy transactions
- Inventory records
- CSV or JSON files containing operational tables

These records should be modeled, validated, and migrated into PostgreSQL later. They should not be stored only as static files in Firebase Storage.

### Document/File Data

Document and file data includes user-uploaded or generated files that should remain files after migration.

Examples:

- Uploaded documents
- Images
- Invoice PDFs
- Report PDFs
- Scanned forms
- Backup files that must remain available as files

These files should migrate to Firebase Storage after access controls, naming conventions, metadata requirements, and rollback procedures are approved.

### Temporary/Archive Data

Temporary or archive data includes files that are useful for migration traceability but should not become active runtime data.

Examples:

- One-time export bundles
- Duplicate exports
- Old backups
- Intermediate reports
- Migration scratch files
- Files with unclear ownership that require review

These should be preserved as archive-only artifacts until retention, compliance, and deletion rules are approved.

## Migration Destination

### PostgreSQL

Use PostgreSQL for structured operational data that the application needs to query, relate, validate, secure, and update.

Examples:

- Patients
- Appointments
- Payments
- Sales
- Users
- Roles
- Pharmacy transactions

### Firebase Storage

Use Firebase Storage for files, documents, images, generated PDFs, and backup artifacts that should remain files.

Examples:

- Uploaded documents
- Images
- Invoices
- Reports
- Backup files retained as files

### Archive Only

Use archive-only storage for exports that must be preserved for auditability or rollback but should not become active application data.

Examples:

- Duplicate exports
- Historical backups outside the migration window
- Temporary export bundles
- Files awaiting classification

## Validation Strategy

Validation must confirm that migration outputs match the Google Drive source inventory without exposing patient data unnecessarily.

### Record Counts

- Count rows in each CSV export.
- Count objects or records in each JSON export.
- Compare source counts against PostgreSQL import counts.
- Track skipped, rejected, duplicate, and manually reviewed records.

### Sample Verification

- Use a privacy-safe sampling process approved before reviewing patient-level content.
- Verify representative samples across each export type.
- Compare key fields, relationships, dates, statuses, and totals.
- Confirm that structured records migrated to PostgreSQL are not left only in file storage.

### Checksum/File Validation

- Capture checksums for files that will move to Firebase Storage or archive-only storage.
- Compare source and target file sizes.
- Validate file names, folder mapping, metadata, and content hashes where possible.
- Confirm that documents, images, invoices, and reports remain readable after migration.

## PHIPA and Security Precautions

The migration must be handled as sensitive health information work and should follow PHIPA-aligned safeguards.

- Do not access patient data directly during inventory unless explicitly approved.
- Start with metadata-only inventory where possible.
- Limit access to authorized migration personnel.
- Use least-privilege access for Google Drive, Firebase, and PostgreSQL.
- Do not commit patient data, export files, credentials, service account keys, or screenshots to the repository.
- Store secrets only in approved secret-management systems.
- Keep audit logs of export access, migration actions, and validation reviews.
- Use encrypted transport and encrypted storage for all migration targets.
- Avoid downloading exports to unmanaged devices or personal folders.
- Redact or de-identify samples whenever possible.
- Confirm retention and deletion requirements before removing any source or archive files.

## Rollback Strategy

Rollback must preserve the original Google Drive exports until migration validation is complete.

- Keep Google Drive source exports unchanged during inventory and initial migration.
- Track every migrated file or record back to its original source file.
- Preserve source-to-target mapping for PostgreSQL records and Firebase Storage objects.
- If a PostgreSQL import fails, disable reads from the imported dataset and return to the previous approved source.
- If a Firebase Storage file migration fails, keep the Google Drive source file as the recovery copy.
- Keep archive-only exports available until retention and compliance review is complete.
- Re-run validation after rollback to confirm the application is using the expected source of truth.

## Guardrails

- Do not modify application code as part of this plan.
- Do not access patient data directly yet.
- Do not connect real Firebase credentials yet.
- Do not connect a production PostgreSQL database yet.
- Do not upload real patient files yet.
- Do not delete or alter Google Drive source exports during inventory.
