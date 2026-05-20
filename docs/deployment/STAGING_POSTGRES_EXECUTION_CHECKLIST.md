# Staging PostgreSQL Execution Checklist

This checklist prepares the first real staging PostgreSQL database for Horizon. It is for staging only. Do not use production credentials, real PHI, patient records, billing records, pharmacy data, or clinical data.

## Recommended Database Provider

Use one of these options:

- Recommended first choice: Render PostgreSQL in Singapore, if the backend is also deployed on Render Singapore.
- Strong alternative: Neon PostgreSQL in Singapore, if the team prefers database-specific tooling, branching, and a managed PostgreSQL-focused provider.

For the first staging launch, keeping the backend and PostgreSQL in the same Singapore region is the simplest and safest option.

## Preflight Checklist

- Staging release branch is selected.
- Staging backend host is selected.
- Staging frontend host is selected.
- Staging Firebase project exists.
- Staging Firebase Auth is enabled.
- Staging Firebase Storage bucket exists.
- No production data is being used.
- No patient or PHI data is being used.
- Backend dependencies include Alembic and PostgreSQL driver.
- Alembic migration files exist.
- Rollback plan is documented.

## Option A: Create Render PostgreSQL In Singapore

1. Open Render dashboard.
2. Create a new PostgreSQL database.
3. Use a staging-only name:

```text
horizon-clinicsuite-staging-db
```

4. Select region:

```text
Singapore
```

5. Select a small staging plan.
6. Confirm this database is not connected to production.
7. After creation, open the database connection settings.
8. Copy the external database URL or internal database URL depending on where the backend runs.
9. Store the URL only in the backend hosting secret manager.

Use Render PostgreSQL first if the staging backend is also Render. This keeps the first deployment easier to operate.

## Option B: Create Neon PostgreSQL In Singapore

1. Open Neon dashboard.
2. Create a new project.
3. Use a staging-only project name:

```text
horizon-clinicsuite-staging
```

4. Select region:

```text
Singapore
```

5. Create the default staging branch.
6. Create or use the default database:

```text
horizon_clinicsuite_staging
```

7. Copy the PostgreSQL connection string.
8. Require SSL if Neon provides an SSL-required connection string.
9. Store the URL only in the backend hosting secret manager.

Use Neon if database branching, stronger database tooling, or a future move away from provider-coupled hosting is preferred.

## Copy DATABASE_URL Securely

Do not paste the staging database URL into Git, documentation, chat, screenshots, or frontend variables.

Expected format:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Provider URLs may include SSL options. Keep those options intact.

Secure handling rules:

- Copy directly from the provider dashboard.
- Paste directly into backend hosting environment variables.
- Do not store it in `.env.example`.
- Do not send it to browser/frontend code.
- Rotate it if accidentally exposed.

## Set HCS_DATABASE_URL In Backend Hosting

In the staging backend host, set:

```text
HCS_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/horizon_clinicsuite_staging
```

Also confirm:

```text
APP_ENV=staging
ENVIRONMENT=staging
BACKEND_CORS_ORIGINS=https://staging-frontend-domain
FIREBASE_PROJECT_ID=staging-firebase-project-id
FIREBASE_STORAGE_BUCKET=staging-storage-bucket
FIREBASE_SERVICE_ACCOUNT_JSON_PATH=/secure/path/to/staging-service-account.json
```

Restart the backend after setting variables.

## Run Alembic Migration

Run migrations from the repository root or backend deployment shell.

```bash
alembic upgrade head
```

If running from the backend directory, confirm `alembic.ini` is available or pass the config path:

```bash
alembic -c ../alembic.ini upgrade head
```

Expected result:

- Migration completes successfully.
- No production database is touched.
- No patient data is imported.
- Operational staging tables are created.

## Verify Tables Exist

Verify the current operational tables exist:

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

Verification options:

- Provider dashboard table browser.
- PostgreSQL client.
- Backend route smoke tests.

Optional SQL:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Pass criteria:

- All expected tables are present.
- No patient, clinical, billing, or pharmacy tables are created for this staging step unless already intentionally scaffolded.

## Create First Admin Organization And User

Use staging-only test data:

```text
Organization name: Horizon Staging Clinic
Organization slug: horizon-staging-clinic
Admin email: staging-admin@example.com
Role: admin
```

Recommended flow:

1. Create staging admin user in Firebase Auth.
2. Sign in through staging frontend.
3. Confirm `/auth/protected-profile` links the Firebase user to an app user.
4. Create the staging organization from the organization admin test page.
5. Assign or seed the admin role using the approved staging-only path.
6. Confirm admin dashboard access.

Do not use a real staff email until staging data controls are approved.

## Persistence Tests

Run these tests with dummy records only.

### Organizations

Create:

```text
Name: Horizon Staging Clinic
Slug: horizon-staging-clinic
```

Verify:

- Organization appears in list.
- Organization remains after backend restart.

### Memberships

Create:

```text
Email/User: staging-provider@example.com
Role: provider
Status: active
```

Verify:

- Member appears in list.
- Status can be changed.
- Record remains after backend restart.

### Invitations

Create:

```text
Invited email: staging-staff@example.com
Invited role: staff
Status: pending
```

Verify:

- Invitation appears in list.
- Invitation can be accepted with token.
- Accepted status remains after backend restart.

### Documents

Use a harmless text file only:

```text
Horizon staging document metadata test
```

Verify:

- File uploads to staging Firebase Storage.
- Metadata registers in PostgreSQL.
- Metadata appears in document list.
- Metadata remains after backend restart.

### Availability

Create:

```text
Provider: staging-provider@example.com
Weekday: Monday
Start time: 09:00
End time: 12:00
Timezone: Asia/Colombo
Available: true
```

Verify:

- Availability appears in list.
- Availability can be updated.
- Record remains after backend restart.

### Appointment Requests

Create dummy non-PHI request:

```text
Patient name: Test Patient
Patient email: test-patient@example.com
Requested date: 2026-06-01
Requested time: 10:00
Reason: Staging appointment request test
Status: pending
```

Verify:

- Request appears in list.
- Status can change to `confirmed`, `cancelled`, and `completed`.
- Record remains after backend restart.

## Backend Status Checks

After migration, verify:

```text
/db/status
/migration/status
/system/health-summary
```

Expected:

- Backend is running.
- Database is configured.
- PostgreSQL ORM module is present.
- Protected routes remain active.

## Rollback Plan

If migration or persistence fails:

1. Stop staging traffic.
2. Do not enter additional test records.
3. Capture backend logs.
4. Restore staging database backup if needed.
5. Re-run migration only after cause is understood.
6. Redeploy previous backend version if required.
7. Keep production and Base44 unchanged.

## Completion Criteria

Staging PostgreSQL setup is complete only when:

- Staging database exists in Singapore.
- `HCS_DATABASE_URL` is set only in backend secrets.
- Alembic migration succeeds.
- Expected tables exist.
- Dummy records persist after backend restart.
- No real PHI was used.
- No patient migration was performed.
