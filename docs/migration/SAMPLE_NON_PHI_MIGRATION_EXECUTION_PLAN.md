# Sample Non-PHI Migration Execution Plan

This plan prepares a sample non-PHI migration rehearsal. It does not authorize real data migration.

Do not migrate real data yet. Do not use PHI. Do not touch production Base44 records.

## Purpose

The goal is to rehearse the migration process using safe sample operational data only. This proves the workflow before any real operational data is considered.

## Execution Status

```text
Status: owner approved, execution pending in staging database environment
Migration execution approved: yes, for sample non-PHI staging rehearsal only
PHI used: no
Patient names used: no
Production Base44 touched: no
Ready for owner approval: complete
```

## Prepared Seed File

Safe sample seed data has been prepared in:

```text
docs/migration/sample_non_phi_seed_data.sql
```

This file is idempotent for the fixed sample IDs and is intended for staging PostgreSQL only.

## Sample Data Rules

- Use fake organization names.
- Use fake staff names.
- Use test email addresses only.
- Use non-clinical appointment request reasons.
- Use harmless document metadata only.
- Do not upload real files unless they are harmless test files.
- Do not use patient names.
- Do not use PHI.
- Do not use billing, payment, pharmacy, or clinical records.

## Sample Organizations

| Sample ID | Name | Status | Notes |
| --- | --- | --- | --- |
| org-sample-001 | Horizon Sample Clinic Colombo | active | Fake sample organization |
| org-sample-002 | Horizon Training Branch Kandy | active | Fake training organization |

## Sample Staff And Users

| Sample ID | Email | First Name | Last Name | Role | Notes |
| --- | --- | --- | --- | --- | --- |
| user-sample-admin | admin.sample@example.com | Aruna | Admin | admin | Fake admin user |
| user-sample-provider | provider.sample@example.com | Nisha | Provider | provider | Fake provider user |
| user-sample-staff | staff.sample@example.com | Kavinda | Staff | staff | Fake staff user |
| user-sample-viewer | viewer.sample@example.com | Meena | Viewer | viewer | Fake viewer user |

## Sample Roles And Memberships

| Organization | User | Role | Status |
| --- | --- | --- | --- |
| Horizon Sample Clinic Colombo | admin.sample@example.com | admin | active |
| Horizon Sample Clinic Colombo | provider.sample@example.com | provider | active |
| Horizon Sample Clinic Colombo | staff.sample@example.com | staff | active |
| Horizon Sample Clinic Colombo | viewer.sample@example.com | viewer | active |

## Sample Availability Records

| Provider | Organization | Weekday | Start Time | End Time | Timezone | Available |
| --- | --- | --- | --- | --- | --- | --- |
| provider.sample@example.com | Horizon Sample Clinic Colombo | Monday | 09:00 | 12:00 | Asia/Colombo | true |
| provider.sample@example.com | Horizon Sample Clinic Colombo | Wednesday | 14:00 | 17:00 | Asia/Colombo | true |

## Sample Appointment Requests

Use non-clinical operational reasons only.

| Request ID | Requester Name | Requester Email | Provider | Date | Time | Reason | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| appt-sample-001 | Test Visitor One | visitor.one@example.com | provider.sample@example.com | 2026-06-01 | 09:30 | General appointment workflow test | pending |
| appt-sample-002 | Test Visitor Two | visitor.two@example.com | provider.sample@example.com | 2026-06-03 | 14:30 | Staff training schedule test | confirmed |

## Sample Document Metadata Only

No patient files. No PHI. Metadata only.

| Document ID | File Name | Storage Path | MIME Type | File Size | Notes |
| --- | --- | --- | --- | --- | --- |
| doc-meta-sample-001 | sample-training-note.txt | test-uploads/sample-training-note.txt | text/plain | 1024 | Harmless sample metadata |
| doc-meta-sample-002 | sample-operations-checklist.pdf | test-uploads/sample-operations-checklist.pdf | application/pdf | 2048 | Harmless sample metadata |

## Proposed Execution Order

Do not run until explicitly approved.

1. Confirm owner approval.
2. Confirm staging environment only.
3. Confirm backup/restore drill completed.
4. Confirm no PHI in sample data.
5. Create sample organizations.
6. Create sample Firebase/Auth users if needed.
7. Link backend app users.
8. Assign roles and memberships.
9. Create availability records.
10. Create appointment requests.
11. Register document metadata only.
12. Validate frontend listing.
13. Validate persistence after refresh.
14. Validate audit logs if applicable.
15. Run rollback/delete test for sample records.

## Rollback/Delete Sample Data Procedure

Preferred rollback for sample rehearsal:

1. Stop sample testing.
2. Export or record sample IDs.
3. Delete sample appointment requests.
4. Delete sample availability records.
5. Delete sample document metadata records.
6. Delete sample invitations/memberships if created.
7. Delete sample users only if safe and approved.
8. Delete sample organizations last.
9. Verify records no longer list in frontend.
10. Keep audit logs if retention policy requires them.

Do not delete real records.

## Owner Approval Required

```text
Decision owner: Dr. Mylashan Mylvaganam
Technical owner:
Operations owner:
Approval date: 2026-05-22
Approved environment: staging PostgreSQL only
Approved sample scope: organizations, staff/users, roles/memberships, availability, appointment requests, document metadata only
Restrictions: no PHI, no patient records, no clinical records, no prescriptions, no billing/payment, no pharmacy transactions, no patient document uploads, no production Base44 changes, no full cutover
```

## Cloud Shell Execution Steps

Run only in a secure Cloud Shell or backend provider shell where staging database access is already configured. Do not paste database URLs, passwords, or secrets into chat.

1. Confirm this is staging only.
2. Confirm `HCS_DATABASE_URL` points to the staging database.
3. Apply the seed file:

```bash
psql "$HCS_DATABASE_URL" -f docs/migration/sample_non_phi_seed_data.sql
```

4. Validate record counts using the validation report.
5. Open the frontend and verify the sample records.
6. Keep Base44 unchanged.

## Current Decision

```text
Ready for owner approval to run sample migration: complete
Ready to run automatically: no
Real data migration: not approved
PHI: blocked
Production Base44 changes: blocked
```
