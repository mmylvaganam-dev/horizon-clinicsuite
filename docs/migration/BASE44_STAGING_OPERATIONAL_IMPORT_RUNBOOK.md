# Base44 Staging Operational Import Runbook

Status: STAGING ONLY - DRY RUN FIRST

This runbook covers the first essential operational import from the final Base44 backup into Horizon staging PostgreSQL.

## Approved Scope

The import script may process only:

- organizations
- users
- roles
- user_roles
- staff profiles as organization memberships

## Explicitly Excluded

Do not import these in this phase:

- patients
- prescriptions
- clinical records
- pharmacy stock
- pharmacy sales
- credit sales
- billing or payment records
- patient documents or files
- document uploads
- full Base44 cutover

These remain review-only until owner approval, security review, and target production schemas are complete.

## Source Folder

The script reads Horizon-shaped review files created by the final backup dry run:

```text
Base44-Final-Backup/10_horizon_import_ready/
```

Expected source files:

- `organizations_review.json`
- `users_review.json`
- `roles_review.json`
- `user_roles_review.json`
- `staff_profiles_review.json`

The script does not read patient, prescription, pharmacy, billing, or document review files.

## Script

```text
scripts/migration/base44_staging_operational_import.py
```

Default behavior is dry-run only. It prints the planned counts and performs no database writes.

## Step 1 - Pull Latest Code In Cloud Shell

```bash
cd ~/horizon-clinicsuite
git pull origin migration/remove-base44-backend
```

## Step 2 - Dry Run Only

```bash
cd ~/horizon-clinicsuite

python3 scripts/migration/base44_staging_operational_import.py \
  --input-dir Base44-Final-Backup/10_horizon_import_ready
```

Expected result:

- status is `dry_run_only_no_database_write`
- counts appear for organizations, users, roles, user_roles, and organization_memberships
- excluded data confirms patients, prescriptions, pharmacy history, documents, and billing are not imported

## Step 3 - Execute In Staging Only

Only run this after reviewing the dry-run counts.

The environment must have:

```text
APP_ENV=staging
HCS_DATABASE_URL=<staging Cloud SQL PostgreSQL URL>
```

Run:

```bash
cd ~/horizon-clinicsuite

APP_ENV=staging python3 scripts/migration/base44_staging_operational_import.py \
  --input-dir Base44-Final-Backup/10_horizon_import_ready \
  --execute
```

Expected result:

- status is `executed`
- created and updated row counts are printed
- a rollback manifest is written under:

```text
Base44-Final-Backup/10_horizon_import_ready/
```

Example manifest name:

```text
staging_operational_import_manifest_base44-operational-YYYYMMDDHHMMSS.json
```

## Verification

After execution, verify:

- `/db/status` still returns connected
- `/system/health-summary` still works
- organization list opens
- membership list opens
- RBAC routes still work
- imported users exist by email
- no patient/pharmacy/billing data was imported

## Rollback

Use the manifest created during execution.

```bash
cd ~/horizon-clinicsuite

APP_ENV=staging python3 scripts/migration/base44_staging_operational_import.py \
  --rollback-manifest Base44-Final-Backup/10_horizon_import_ready/staging_operational_import_manifest_<BATCH_ID>.json \
  --confirm-rollback
```

Rollback deletes only rows that the manifest says were created by that import run.

Rows that existed before the import may have been updated with Base44 trace metadata and are not automatically deleted.

## Safety Notes

- Do not commit `Base44-Final-Backup/`.
- Do not paste raw JSON records into chat.
- Do not use production database credentials.
- Do not run with `APP_ENV=production`.
- Do not import PHI or pharmacy history in this phase.
- Keep the original Base44 export JSON files as permanent archive backup.
