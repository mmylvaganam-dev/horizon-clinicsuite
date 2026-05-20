# Staging Database Smoke Tests

These smoke tests verify that Horizon staging PostgreSQL persistence works. Use dummy data only. Do not create real patient records, upload PHI, or migrate production data.

## Test Result Format

Record each test as:

```text
PASS / FAIL / BLOCKED
```

For each failure, record:

```text
Test:
Status:
Observed result:
Expected result:
Owner:
Next action:
```

## Required Test Accounts

Use staging-only accounts:

```text
Admin: staging-admin@example.com
Provider: staging-provider@example.com
Staff: staging-staff@example.com
Viewer: staging-viewer@example.com
```

Do not use real production staff accounts until staging controls are approved.

## Required Test Organization

```text
Organization name: Horizon Staging Clinic
Organization slug: horizon-staging-clinic
```

Pass criteria:

- Organization can be created by admin.
- Organization appears in list.
- Organization remains after backend restart.

## Database Migration Smoke Test

Steps:

1. Set `HCS_DATABASE_URL` to the staging PostgreSQL connection string.
2. Run:

```bash
alembic upgrade head
```

3. Verify expected tables exist.

Expected tables:

```text
organizations
users
roles
user_roles
organization_members
invitations
document_metadata
provider_availability
appointment_requests
audit_logs
```

Pass criteria:

- Migration exits successfully.
- All expected tables exist.
- No production database is touched.
- No patient data is imported.

## Organization Persistence Smoke Test

Test record:

```text
Name: Horizon Staging Clinic
Slug: horizon-staging-clinic
```

Steps:

1. Sign in as admin.
2. Create organization.
3. Refresh organization list.
4. Restart backend.
5. Refresh organization list again.

Pass criteria:

- Organization appears before restart.
- Organization appears after restart.
- Audit event is created for organization creation.

## Membership Persistence Smoke Test

Test record:

```text
User email: staging-provider@example.com
Role: provider
Status: active
```

Steps:

1. Sign in as admin.
2. Add provider member.
3. Confirm member appears in list.
4. Change status to inactive.
5. Change status back to active.
6. Restart backend.
7. Confirm final status remains active.

Pass criteria:

- Admin can add member.
- Admin can update member status.
- Provider/staff/viewer cannot perform admin-only writes.
- Member remains after restart.

## Invitation Persistence Smoke Test

Test record:

```text
Invited email: staging-staff@example.com
Invited role: staff
Status: pending
```

Steps:

1. Sign in as admin.
2. Create invitation.
3. Confirm invitation appears in list.
4. Copy generated token.
5. Accept invitation using token.
6. Restart backend.
7. Confirm invitation status remains accepted.

Pass criteria:

- Admin can create invitation.
- Admin can list invitation.
- Invited user can accept with token.
- Non-admin cannot create/list invitations.
- Accepted status persists.

## Document Metadata Persistence Smoke Test

Test file content:

```text
Horizon staging Firebase Storage metadata smoke test
```

Test metadata:

```text
File name: staging-storage-smoke-test.txt
Storage path: test-uploads/staging-storage-smoke-test.txt
Mime type: text/plain
File size: small test file only
```

Steps:

1. Sign in as admin, provider, or staff.
2. Upload harmless file to staging Firebase Storage.
3. Register document metadata in backend.
4. Confirm document appears in list.
5. Restart backend.
6. Confirm metadata still appears.

Pass criteria:

- Upload uses staging Firebase Storage only.
- Metadata is written to PostgreSQL.
- Metadata remains after restart.
- Viewer is read-only.
- No PHI or real document is uploaded.

## Availability Persistence Smoke Test

Test record:

```text
Provider: staging-provider@example.com
Weekday: Monday
Start time: 09:00
End time: 12:00
Timezone: Asia/Colombo
Available: true
```

Steps:

1. Sign in as provider.
2. Create own availability.
3. Update end time to `13:00`.
4. Sign in as admin.
5. Confirm admin can view/manage availability.
6. Restart backend.
7. Confirm updated record remains.

Pass criteria:

- Provider can manage own availability.
- Admin can manage provider availability.
- Provider cannot manage another provider's availability.
- Availability persists after restart.

## Appointment Request Persistence Smoke Test

Test record:

```text
Patient name: Test Patient
Patient email: test-patient@example.com
Requested provider: staging-provider@example.com
Requested date: 2026-06-01
Requested time: 10:00
Reason: Staging appointment request test
Status: pending
```

Steps:

1. Sign in as admin, provider, or staff.
2. Create appointment request.
3. Confirm request appears in list.
4. Update status to `confirmed`.
5. Update status to `cancelled`.
6. Update status to `completed`.
7. Restart backend.
8. Confirm final status remains `completed`.

Pass criteria:

- Admin/provider/staff can create request.
- Viewer can list read-only.
- Viewer cannot create or update.
- Valid statuses work: `pending`, `confirmed`, `cancelled`, `completed`.
- Appointment request persists after restart.
- No real patient appointment is created.

## Audit Log Smoke Test

Steps:

1. Create organization.
2. Update profile.
3. Register document metadata.
4. Sign in as admin.
5. View audit logs.
6. Sign in as non-admin.
7. Attempt to view audit logs.

Pass criteria:

- Admin can view audit logs.
- Non-admin receives unauthorized response.
- Logs show action type, resource type, user, and timestamp.
- Audit logs persist after backend restart.

## Backend Restart Persistence Test

After all records are created:

1. Restart the staging backend service.
2. Sign back in.
3. Reopen each module list.

Pass criteria:

- Organization remains.
- Membership remains.
- Invitation remains.
- Document metadata remains.
- Availability remains.
- Appointment request remains.
- Audit logs remain.

## Stop Criteria

Stop staging database testing immediately if:

- Real PHI is entered.
- A production database URL is used.
- RBAC allows unauthorized writes.
- Storage rules expose test files publicly beyond expected behavior.
- Migration runs against the wrong database.

If any stop condition occurs, record it in the staging freeze decision log and do not proceed toward production planning.
