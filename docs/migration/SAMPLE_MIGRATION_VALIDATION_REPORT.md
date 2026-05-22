# Sample Migration Validation Report

This report template validates a sample non-PHI migration rehearsal.

Do not use PHI. Do not use patient names. Do not touch production Base44 records.

## Validation Status

```text
Status: owner approved; execution not run from Codex environment because staging database credentials/tools are not available here
Environment: staging PostgreSQL only
Validation date: pending execution
Validated by: pending
PHI used: no
Patient names used: no
Production Base44 touched: no
```

## Execution Note

Owner approval was granted by Dr. Mylashan Mylvaganam for a sample non-PHI staging migration rehearsal only.

Codex did not run the migration because this workspace has no `HCS_DATABASE_URL`, no `psql`, and no `gcloud` access. To avoid exposing secrets, the migration must be executed from Cloud Shell or the backend hosting environment where staging database access is already configured securely.

Prepared seed file:

```text
docs/migration/sample_non_phi_seed_data.sql
```

Approved command for secure staging environment:

```bash
psql "$HCS_DATABASE_URL" -f docs/migration/sample_non_phi_seed_data.sql
```

## Sample Data Categories

| Category | Expected | Created | Listed In Frontend | Persists After Refresh | Notes |
| --- | --- | --- | --- | --- | --- |
| Organizations | 2 | Pending execution | Pending | Pending | Fake organizations only |
| Staff/users | 4 | Pending execution | Pending | Pending | Test emails only |
| Roles | 4 | Pending execution | Pending | Pending | admin/provider/staff/viewer |
| User roles | 4 | Pending execution | Pending | Pending | admin/provider/staff/viewer |
| Organization memberships | 4 | Pending execution | Pending | Pending | admin/provider/staff/viewer |
| Availability records | 2 | Pending execution | Pending | Pending | Fake provider availability |
| Appointment requests | 2 | Pending execution | Pending | Pending | Non-clinical reasons only |
| Document metadata | 2 | Pending execution | Pending | Pending | Metadata only, no PHI files |

## Records Created Check

- [ ] Seed file executed in staging.
- [ ] Sample organizations created.
- [ ] Sample staff/users created or linked.
- [ ] Sample roles created.
- [ ] Sample roles/memberships created.
- [ ] Sample availability records created.
- [ ] Sample appointment requests created.
- [ ] Sample document metadata created.
- [ ] No patient records created.
- [ ] No PHI entered.
- [ ] No production Base44 records touched.

## Frontend Listing Check

Verify in Horizon staging:

- [ ] Organizations list displays sample organizations.
- [ ] Memberships list displays sample users/roles.
- [ ] Availability page displays sample availability.
- [ ] Appointment request page displays sample requests.
- [ ] Documents page displays sample metadata only.
- [ ] Viewer role remains read-only.
- [ ] Unauthorized actions remain blocked.

## Persistence After Refresh Check

For each module:

- [ ] Create sample record.
- [ ] Refresh page.
- [ ] Confirm record still displays.
- [ ] Log out and log back in.
- [ ] Confirm record still displays.
- [ ] Confirm `/db/status` remains connected.

## SQL Count Validation

Run after the seed file executes:

```sql
select 'organizations' as table_name, count(*) as sample_count
from organizations
where base44_id like 'sample-non-phi-%'
union all
select 'users', count(*)
from users
where base44_id like 'sample-non-phi-%'
union all
select 'roles', count(*)
from roles
where base44_id like 'sample-non-phi-%'
union all
select 'user_roles', count(*)
from user_roles
where metadata_json->>'sample_seed' = 'true'
union all
select 'organization_members', count(*)
from organization_members
where id in (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd4'
)
union all
select 'provider_availability', count(*)
from provider_availability
where id in (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'
)
union all
select 'appointment_requests', count(*)
from appointment_requests
where id in (
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  'ffffffff-ffff-4fff-8fff-fffffffffff2'
)
union all
select 'document_metadata', count(*)
from document_metadata
where storage_path like 'test-uploads/sample-%';
```

Expected counts:

- organizations: 2
- users: 4
- roles: 4
- user_roles: 4
- organization_members: 4
- provider_availability: 2
- appointment_requests: 2
- document_metadata: 2

## Audit Logs Created If Applicable

Check audit logs for:

- [ ] Organization creation.
- [ ] Membership or role change.
- [ ] Document metadata registration.
- [ ] Profile/user update if applicable.
- [ ] Appointment status update if logged.
- [ ] Availability update if logged.

Audit limitations:

- If a module does not yet log audit events, record that as a follow-up.
- Do not treat missing audit coverage as approval for PHI.

## Rollback/Delete Test Data Procedure

Run only on sample records:

1. Record sample IDs.
2. Delete sample document metadata.
3. Delete sample appointment requests.
4. Delete sample availability records.
5. Delete sample organization memberships.
6. Delete sample user roles.
7. Delete sample roles.
8. Delete sample users if safe.
9. Delete sample organizations last.
10. Refresh frontend lists.
11. Confirm sample records are removed or inactive.
12. Confirm no real records were affected.

Rollback SQL for staging sample data only:

```sql
begin;

delete from document_metadata
where storage_path like 'test-uploads/sample-%';

delete from appointment_requests
where id in (
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  'ffffffff-ffff-4fff-8fff-fffffffffff2'
);

delete from provider_availability
where id in (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'
);

delete from organization_members
where id in (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd4'
);

delete from user_roles
where id in (
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc4'
);

delete from roles
where base44_id like 'sample-non-phi-role-%';

delete from users
where base44_id like 'sample-non-phi-user-%';

delete from organizations
where base44_id like 'sample-non-phi-org-%';

commit;
```

Rollback result:

```text
Rollback/delete performed: yes/no
Records removed:
Records retained:
Errors:
No real records affected: yes/no
```

## Pass/Fail Summary

| Validation Area | Result | Notes |
| --- | --- | --- |
| Records created | Pending execution | Codex cannot connect to staging DB without secrets/tools |
| Frontend listing | Pending |  |
| Persistence after refresh | Pending |  |
| Role restrictions | Pending |  |
| Audit logs | Pending/not applicable for direct SQL seed | Backend API actions may log; direct SQL seed may not |
| Rollback/delete | Pending |  |
| No PHI | Prepared seed contains no PHI |  |
| Base44 untouched | Yes in Codex environment | No Base44 records touched |

## Decision

```text
Sample migration validation result: pending execution in secure staging environment
Ready for limited real non-PHI migration: no
Ready for PHI migration: no
Ready for production Base44 cutover: no
```

## Sign-Off

```text
Reviewer:
Date:
Decision:
Approved next step:
Restrictions:
```
