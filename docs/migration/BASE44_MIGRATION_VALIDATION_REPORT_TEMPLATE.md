# Base44 Migration Validation Report Template

Status: template

Migration batch ID:

Dry-run date:

Reviewer:

Dataset location:

No PHI imported into production: yes/no

Base44 production records modified: no

## Export Files

| File | Entity | Record count | SHA256 captured | Approved for dry run |
| --- | --- | ---: | --- | --- |
| `Organization.json` | Organization |  |  |  |
| `User.json` | User |  |  |  |
| `StaffProfile.json` | StaffProfile |  |  |  |
| `Patient.json` | Patient |  |  | blocked for real import |
| `TeleAppointment.json` | TeleAppointment |  |  |  |
| `Prescription.json` | Prescription |  |  | blocked |
| `PharmacySaleHeader.json` | PharmacySaleHeader |  |  | blocked |
| `PharmacySaleItem.json` | PharmacySaleItem |  |  | blocked |
| `PatientDocument.json` | PatientDocument |  |  | blocked |

## Count Validation

| Category | Base44 count | Horizon dry-run count | Difference | Pass/fail |
| --- | ---: | ---: | ---: | --- |
| Users |  |  |  |  |
| Organizations/clinics |  |  |  |  |
| Roles |  |  |  |  |
| Appointments |  |  |  |  |
| Provider availability |  |  |  |  |
| Document metadata |  |  |  |  |
| Patients |  |  |  | blocked |
| Pharmacy records |  |  |  | blocked |

## Field Validation

| Entity | Required field | Missing count | Transform rule | Pass/fail |
| --- | --- | ---: | --- | --- |
| User | email |  | lowercase/deduplicate |  |
| Patient | first_name/last_name |  | PHI review required | blocked |
| TeleAppointment | scheduled_time |  | split date/time |  |
| TeleProviderAvailability | provider_id |  | map to Horizon user |  |
| PharmacySaleHeader | sale total |  | reconcile to line totals | blocked |
| PharmacySaleItem | product reference |  | map product/inventory | blocked |

## User Migration Validation

- [ ] Emails normalized to lowercase.
- [ ] Duplicate emails reviewed.
- [ ] Firebase Auth users linked by email.
- [ ] `users.base44_id` populated for migrated users.
- [ ] No passwords migrated.
- [ ] Admin/provider/staff/viewer roles assigned correctly.

## Patient and Pharmacy Risk Review

- [ ] Patient table schema approved.
- [ ] Pharmacy schema approved.
- [ ] Prescriptions reviewed by clinical owner.
- [ ] Pharmacy sales totals reconciled.
- [ ] Inventory quantities reconciled.
- [ ] No patient documents uploaded to Firebase Storage before rules approval.

## Sample Verification

| Sample | Base44 ID | Horizon ID | Result |
| --- | --- | --- | --- |
| User sample 1 |  |  |  |
| Appointment sample 1 |  |  |  |
| Patient sample 1 |  |  | blocked |
| Pharmacy sale sample 1 |  |  | blocked |

## Rollback Readiness

- [ ] Migration batch ID recorded.
- [ ] Base44 remains available.
- [ ] Cloud SQL backup exists.
- [ ] Delete/rollback SQL reviewed.
- [ ] Owner sign-off completed.

## Decision

Dry run accepted: yes/no

Approved to import non-PHI operational data: yes/no

Approved to import PHI: no

Approved to import pharmacy records: no
