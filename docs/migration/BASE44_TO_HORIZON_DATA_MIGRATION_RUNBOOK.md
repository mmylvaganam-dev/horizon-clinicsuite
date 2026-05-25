# Base44 to Horizon Data Migration Runbook

Status: planning and dry-run only

Do not import real patient, pharmacy, billing, prescription, clinical, or document data until the exported dataset, mappings, backups, and owner approval are reviewed.

## Current Findings

The repository contains 28 explicit Base44 entity definition files in `base44/entities/` and 236 Base44 entity names referenced through the frontend and Base44 functions.

### Base44 Entity Definitions Found

| Entity | Category | Initial target | Migration status |
| --- | --- | --- | --- |
| `CreditMonthlyInvoice` | billing/pharmacy | future billing tables | blocked |
| `CreditSale` | billing/pharmacy | future pharmacy credit sale tables | blocked |
| `HomeCareReport` | clinical/patient | future home care clinical tables | blocked |
| `HomeCareSchedule` | scheduling/tasks | future scheduling tables | blocked |
| `Institution` | organizations/clinics | `organizations` or future institution table | review |
| `LabResultEntry` | clinical/patient | future lab result tables | blocked |
| `Patient` | clinical/patient | future `patients` table | blocked |
| `PendingInvitation` | identity/admin | `invitations` | dry-run candidate |
| `Prescription` | clinical/pharmacy | future prescription tables | blocked |
| `PurchaseOrder` | pharmacy/procurement | future procurement tables | blocked |
| `Result` | clinical/patient | future lab result tables | blocked |
| `RxFavorite` | pharmacy/config | future prescription favorite table | blocked |
| `StaffCredentialDocument` | documents/files | `document_metadata` plus Firebase Storage | review |
| `StaffProfile` | identity/admin | `users`, `organization_members` | dry-run candidate |
| `TeleAppointment` | appointments/tasks | `appointment_requests` now, future appointments table later | dry-run candidate |
| `TeleConsultationBilling` | billing | future billing tables | blocked |
| `TelePaymentGatewayConfig` | settings/config | future payment config table | blocked |
| `TelePricingConfig` | settings/config | future pricing config table | review |
| `TeleProviderAvailability` | appointments/tasks | `provider_availability` | dry-run candidate |
| `TeleProviderTimeOff` | appointments/tasks | future provider time-off table | review |
| `TeleSubscription` | billing/telehealth | future subscription table | blocked |
| `WholesaleDelivery` | pharmacy/wholesale | future wholesale logistics table | blocked |
| `WholesaleGRN` | pharmacy/wholesale | future goods receipt table | blocked |
| `WholesaleGRNLine` | pharmacy/wholesale | future goods receipt line table | blocked |
| `WholesaleMessage` | pharmacy/wholesale | future wholesale message table | blocked |
| `WholesaleReturn` | pharmacy/wholesale | future wholesale return table | blocked |
| `WholesaleReturnLine` | pharmacy/wholesale | future wholesale return line table | blocked |
| `WholesaleSubscription` | pharmacy/wholesale | future wholesale subscription table | blocked |

## Migration Mapping Table

| Base44 source | Horizon target | Direct fields | Transform fields | Notes |
| --- | --- | --- | --- | --- |
| `User` export | `users` | `email`, `first_name`, `last_name`, `name`, `status` | `id -> base44_id`, Firebase UID lookup by email | Do not migrate passwords. Firebase Auth owns login. |
| `StaffProfile` | `users`, `organization_members` | `email`, `first_name`, `last_name`, `phone`, `status` | `id -> base44_id`, `staff_type -> role`, `organization_id -> organizations.base44_id` | Needs duplicate-email review. |
| `Role` | `roles` | `name`, `code`, `description`, `permissions` | `id -> base44_id`, role code normalization | Use only approved role codes: `admin`, `provider`, `staff`, `viewer`. |
| `UserRole` | `user_roles` | user/role relationships | Base44 user ID and role ID resolved to Horizon UUIDs | Must verify organization scope. |
| `PendingInvitation` | `invitations` | `email`, `role`, `organization_id`, `status` | `email -> invited_email`, `role -> invited_role`, generate safe token | Do not send emails during import. |
| `Institution` | `organizations` or future `institutions` | `name`, `status`, contact fields | `id -> base44_id`, contact fields into `metadata_json` | Use `organizations` only if it represents a clinic/org tenant. |
| `TeleProviderAvailability` | `provider_availability` | `day_of_week`, `start_time`, `end_time`, `is_active` | `day_of_week -> weekday`, `provider_id -> users.id`, default timezone | Requires provider user mapping. |
| `TeleAppointment` | `appointment_requests` | `patient_name`, `patient_email`, `scheduled_time`, `status`, `patient_notes` | split `scheduled_time` into date/time, map provider, map status | True appointments table is still needed before production cutover. |
| `Patient` | future `patients` | `first_name`, `last_name`, `date_of_birth`, `gender`, `email`, `phone`, `mobile`, `status` | `id -> base44_id`, PHN/MRN/NIC normalization, consent booleans | Blocked until PHI schema, privacy review, and restore drill are complete. |
| `PatientDocument`, `StaffCredentialDocument`, file URL fields | `document_metadata`, Firebase Storage | `file_name`, `mime_type`, `file_size` if present | Base44 file URL to Firebase path, preserve original URL in metadata | Do not upload patient documents until storage rules are approved. |
| `Prescription`, `RxFavorite` | future pharmacy/prescription tables | drug fields, directions, quantity | patient/provider/organization references | High risk. Requires clinical pharmacy validation. |
| `PharmacySaleHeader`, `PharmacySaleItem`, `CreditSale` | future pharmacy sales tables | sale dates, totals, item lines | inventory/product/account mappings | High risk. Do not import without accounting and stock reconciliation. |

## Required Export Files

Use JSON array exports whenever possible. CSV is acceptable for flat records but not preferred for nested fields.

Minimum dry-run export folder:

```text
exports/base44-dry-run/
  Organization.json
  User.json
  Role.json
  UserRole.json
  StaffProfile.json
  PendingInvitation.json
  TeleProviderAvailability.json
  TeleAppointment.json
  Patient.json
  PatientDocument.json
  Prescription.json
  PharmacySaleHeader.json
  PharmacySaleItem.json
  CreditSale.json
```

If Base44 exports use plural filenames, keep the original names and record them in the validation report.

## Export Instructions

1. Confirm Base44 remains the production source of truth.
2. Take a fresh Base44 backup/export to Google Drive.
3. Copy export files into a separate dry-run folder.
4. Do not edit the original export files.
5. Confirm the folder contains only the copied/exported dataset.
6. Generate checksums before review:

```bash
find exports/base44-dry-run -type f -maxdepth 1 -print0 | xargs -0 shasum -a 256 > exports/base44-dry-run/SHA256SUMS.txt
```

## User Migration Plan

1. Export Base44 users and staff profiles.
2. Normalize emails to lowercase.
3. Deduplicate by email before import.
4. Create Firebase Auth users manually or by reviewed Firebase Admin script.
5. Do not migrate passwords.
6. Link Horizon `users.firebase_uid` by Firebase Auth email lookup.
7. Preserve Base44 IDs in `users.base44_id`.
8. Assign roles through `roles`, `user_roles`, and `organization_members`.

## Import Script Plan

The dry-run scripts under `scripts/migration/` perform inventory and transformation only. They do not import PHI into PostgreSQL.

Safe dry-run outputs:

- normalized users
- normalized organizations
- normalized roles
- normalized invitations
- normalized provider availability
- normalized appointment requests
- document metadata candidates
- blocked patient/pharmacy record counts

Blocked until schema approval:

- patient clinical records
- prescriptions
- pharmacy sale/inventory records
- patient documents
- billing/payment records

## Pharmacy and Patient Migration Risk Checklist

- [ ] Owner approval for PHI migration.
- [ ] Final PostgreSQL patient schema exists and includes `base44_id`.
- [ ] Final pharmacy sales/inventory schema exists and includes `base44_id`.
- [ ] Firebase Storage production rules approved.
- [ ] Cloud SQL backup and restore drill completed.
- [ ] Export checksums recorded.
- [ ] Dry-run counts match Base44 exports.
- [ ] Sample patient records verified manually.
- [ ] Pharmacy totals reconcile by day and by sale header.
- [ ] Prescription records reviewed by clinical owner.
- [ ] Rollback plan signed off.
- [ ] Base44 remains available during parallel run.

## Rollback Instructions

Dry run rollback:

```bash
rm -rf exports/base44-dry-run-transformed
```

Database rollback for future approved imports must use a migration batch ID:

```sql
-- Example only. Do not run until real import tables and migration_batch_id exist.
delete from document_metadata where storage_path like 'base44-migration/%';
delete from appointment_requests where created_at >= :migration_started_at;
delete from organization_members where created_at >= :migration_started_at;
delete from user_roles where metadata_json->>'migration_batch_id' = :migration_batch_id;
delete from users where metadata_json->>'migration_batch_id' = :migration_batch_id;
delete from organizations where metadata_json->>'migration_batch_id' = :migration_batch_id;
```

## Exact Next Commands

Run inventory only:

```bash
python3 scripts/migration/base44_export_inventory.py --export-dir exports/base44-dry-run
```

Run dry-run transformation only:

```bash
python3 scripts/migration/base44_to_horizon_dry_run.py \
  --export-dir exports/base44-dry-run \
  --output-dir exports/base44-dry-run-transformed
```

Review generated output:

```bash
ls -la exports/base44-dry-run-transformed
cat exports/base44-dry-run-transformed/validation_summary.json
```

Do not run any real import until the generated validation summary is reviewed.
