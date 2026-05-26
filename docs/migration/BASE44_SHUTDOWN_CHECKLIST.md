# Base44 Shutdown Checklist

Status: required before Base44 shutdown

## Before Export

- [ ] Confirm Base44 shutdown date.
- [ ] Confirm owner responsible for export.
- [ ] Confirm admin/platform-owner access still works.
- [ ] Confirm Google Drive backup access.
- [ ] Confirm Horizon Cloud SQL backup is available.
- [ ] Confirm no one deletes or edits Base44 records during export.

## Full Archive Backup

- [ ] Export/download all available Base44 entity data.
- [ ] Download latest Google Drive backup JSON files.
- [ ] Export document/file metadata and file references.
- [ ] Download critical document files where possible.
- [ ] Store raw files under `01_raw-full-archive`.
- [ ] Generate SHA256 checksums.
- [ ] Record file counts and entity counts.
- [ ] Keep raw archive permanently.

## Essential Operational Transition

- [ ] Export users.
- [ ] Export staff profiles.
- [ ] Export organizations/institutions.
- [ ] Export patients.
- [ ] Export appointments.
- [ ] Export active prescriptions.
- [ ] Export provider availability.
- [ ] Export document metadata.
- [ ] Transform into Horizon dry-run format.
- [ ] Review validation summary.
- [ ] Confirm every transformed record preserves `base44_id`.

## Later Historical Pharmacy

- [ ] Export pharmacy sale headers.
- [ ] Export pharmacy sale items.
- [ ] Export credit sales.
- [ ] Export stock and inventory entities.
- [ ] Export invoices/payments if available.
- [ ] Do not import until reconciliation is reviewed.

## Validation

- [ ] Counts match Base44 UI/export counts.
- [ ] Checksums recorded.
- [ ] Duplicate user emails reviewed.
- [ ] Missing patient names reviewed.
- [ ] Missing appointment dates reviewed.
- [ ] Active prescriptions reviewed.
- [ ] Pharmacy totals marked for later reconciliation.

## Shutdown Day

- [ ] Confirm final backup completed.
- [ ] Confirm archive copied to at least two safe locations.
- [ ] Confirm Horizon essential import files are ready for review.
- [ ] Keep Base44 read access as long as possible.
- [ ] Do not delete Base44 app/data manually.

## Rollback

- [ ] Keep Base44 raw archive untouched.
- [ ] Keep Horizon pre-import database backup.
- [ ] If Horizon import fails, stop import and keep manual workflow active.
- [ ] Restore Horizon database only if approved by owner.
