# Data Migration Source Plan

This plan clarifies where Base44 migration data currently comes from and where each category of data should land. It is documentation only and does not modify application code.

## Source of Current Base44 Backups and Exports

Base44 backup and export files are currently stored in Google Drive. Google Drive should be treated as the migration source location for exported files until every export has been inventoried, classified, validated, and migrated to the correct target system.

Google Drive is not the long-term runtime storage layer for Horizon Clinical Suite. It is the current holding area for Base44 exports and backup artifacts.

## Target Systems by Data Type

### Google Drive

Google Drive is the current source for Base44 backup and export files.

Use it for:

- Locating existing Base44 exports.
- Inventorying file names, folders, dates, owners, and export formats.
- Preserving the original backup/export copies during migration.

Do not use it as the final application storage layer.

### Firebase Storage

Firebase Storage is the target for files, documents, and backup artifacts.

Use it for:

- Uploaded documents.
- File attachments.
- Export files that must remain available as files.
- Backup artifacts that should be retained as files.

Do not use Firebase Storage as the only storage location for structured operational data. Structured records stored only as JSON, CSV, spreadsheet, or archive files would be difficult to query, validate, relate, secure at row level, and use in application workflows.

### PostgreSQL

PostgreSQL is the target for structured operational application data.

Use it later for:

- Patients.
- Sales.
- Appointments.
- Payments.
- Users.
- Roles.
- Pharmacy transactions.
- Other relational business records that need querying, reporting, permissions, validation, and transactional consistency.

Structured app data should migrate into PostgreSQL after the schema, migration tooling, validation process, rollback process, and staged rollout plan are ready.

### Firebase Auth

Firebase Auth is the target authentication system for users.

Use it for:

- User sign-in.
- Identity provider integration.
- Authentication session management.
- User authentication lifecycle events.

Firebase Auth should handle authentication identity. Application-specific user profile fields, role assignments, permissions, audit logs, and operational user relationships should be represented in PostgreSQL where relational structure is required.

## Safe Migration Order

1. Inventory Google Drive export files.

   Capture folder paths, file names, export dates, formats, owners, approximate sizes, and any known Base44 entity type. Keep the original files untouched.

2. Classify files versus structured data.

   Separate true files and documents from structured operational exports. For example, PDFs, uploaded documents, images, and backup archives belong in the file migration path. Patient records, appointments, payments, users, roles, sales, and pharmacy transactions belong in the structured data migration path.

3. Migrate files to Firebase Storage.

   Move approved files, documents, and backup artifacts into Firebase Storage only after bucket structure, access rules, naming conventions, metadata fields, and rollback procedures are defined. Do not upload real patient files until privacy and access controls are confirmed.

4. Migrate structured data to PostgreSQL.

   Load structured operational records into PostgreSQL only after schemas, foreign keys, indexes, import scripts, validation reports, and rollback procedures are prepared. Do not rely on Firebase Storage files as the only operational copy of structured app data.

5. Validate counts and sample records.

   Compare source and target record counts, file counts, checksums where appropriate, and representative sample records. Validate relationships such as patient appointments, payments, users, roles, and pharmacy transactions before enabling application reads from the new targets.

## Guardrails

- Do not modify application code as part of this documentation step.
- Do not connect real Firebase credentials yet.
- Do not upload real patient files yet.
- Do not connect a production PostgreSQL database yet.
- Do not treat Firebase Storage as a replacement for PostgreSQL structured data.
- Keep Google Drive Base44 exports preserved until migration validation and rollback requirements are complete.
