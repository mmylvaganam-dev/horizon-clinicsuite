# Base44 Shutdown Rollback Plan

Status: planning only

## Rollback Principles

- Base44 raw exports are never modified.
- Horizon imports must use a migration batch ID.
- Import scripts must be repeatable.
- Any failed import stops before patient/pharmacy production use.

## If Export Fails

1. Do not shut down Base44 voluntarily.
2. Run Google Drive backup again.
3. Export high-priority entities manually first:
   - User
   - StaffProfile
   - Organization
   - Patient
   - Appointment
   - Prescription
   - PharmacySaleHeader
   - PharmacySaleItem
4. Record missing entities in the validation count sheet.

## If Essential Transform Fails

1. Keep raw archive untouched.
2. Save the error output.
3. Fix transformation mapping.
4. Re-run into a new output folder.
5. Do not import partial transformed data.

## If Horizon Import Fails Later

Use the pre-import Cloud SQL backup first. If selective rollback is approved, delete only records from the migration batch.

Example only:

```sql
delete from document_metadata where metadata_json->>'migration_batch_id' = :migration_batch_id;
delete from appointment_requests where metadata_json->>'migration_batch_id' = :migration_batch_id;
delete from provider_availability where metadata_json->>'migration_batch_id' = :migration_batch_id;
delete from organization_members where status = 'migration_pending' and created_at >= :migration_started_at;
delete from user_roles where metadata_json->>'migration_batch_id' = :migration_batch_id;
delete from users where metadata_json->>'migration_batch_id' = :migration_batch_id;
delete from organizations where metadata_json->>'migration_batch_id' = :migration_batch_id;
```

## Permanent Archive

Keep these permanently:

- raw entity exports
- Google Drive backup JSON
- exported document files
- checksums
- validation count sheets
- import summaries
- owner sign-off records
