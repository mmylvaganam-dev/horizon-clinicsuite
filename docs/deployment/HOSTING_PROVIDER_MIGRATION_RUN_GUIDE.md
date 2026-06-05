# Hosting Provider Migration Run Guide

This guide explains how to run Horizon staging database migrations from the hosting provider environment where `HCS_DATABASE_URL` is already stored securely.

Do not run this against production. Do not use PHI. Do not paste `DATABASE_URL`, `HCS_DATABASE_URL`, passwords, service-account JSON, or secrets into chat, logs, screenshots, tickets, or documentation.

## When To Use This Guide

Use this guide after:

- Staging PostgreSQL has been created.
- `HCS_DATABASE_URL` has been added securely to Cloud Run secrets or the backend hosting provider.
- Backend code has been deployed or is available to the provider shell/job.
- Alembic migration files are present.
- You are ready to create staging tables.

## Required Migration Command

Run these commands from the backend service environment:

```bash
pip install -r requirements.txt
alembic upgrade head
```

If the shell starts in the repository root instead of `backend`, use:

```bash
pip install -r backend/requirements.txt
alembic upgrade head
```

If the shell starts inside `backend` and Alembic cannot find the root config, use:

```bash
pip install -r requirements.txt
alembic -c ../alembic.ini upgrade head
```

## Cloud Run Job Or Provider Shell

Official staging flow on Google Cloud:

1. Open Google Cloud console.
2. Select the staging project.
3. Confirm Cloud SQL PostgreSQL is configured.
4. Confirm Cloud Run has access to `HCS_DATABASE_URL` through Secret Manager or secure environment configuration.
5. Do not reveal or print the value.
6. Run a one-time migration job using the same backend code and secrets.

Cloud Run job command:

```bash
pip install -r requirements.txt && alembic upgrade head
```

If using a temporary Cloud Run job, give it the same database secret access as the staging API service, then delete or disable the job after migration succeeds.

Pass criteria:

- Command exits successfully.
- No production database is touched.
- Staging Cloud SQL tables are created.
- Staging Cloud Run backend can still start after migration.

## Render Backend Shell Or Job

Render is an optional alternative only. Use this section only if Google Cloud setup is temporarily blocked.

Optional staging flow on Render:

1. Open the Render dashboard.
2. Open the staging backend web service.
3. Confirm environment variables include `HCS_DATABASE_URL`.
4. Do not reveal or print the value.
5. Open Shell if available for the service.
6. Run:

```bash
pip install -r requirements.txt
alembic upgrade head
```

If Render Shell is not available on the selected plan:

1. Create a one-time Render job or temporary private service using the same repository and environment variables.
2. Use the same staging `HCS_DATABASE_URL`.
3. Run the migration command once.
4. Delete or disable the temporary job after success.

Render one-time job command:

```bash
pip install -r requirements.txt && alembic upgrade head
```

Pass criteria:

- Command exits successfully.
- No production database is touched.
- Staging backend can still start after migration.

## Railway Shell Or Job

Railway is an optional alternative only. Use this section only if Google Cloud setup is temporarily blocked.

Optional staging flow on Railway:

1. Open the Railway project.
2. Open the staging backend service.
3. Confirm `HCS_DATABASE_URL` is configured as a service variable.
4. Do not print or reveal the value.
5. Open the Railway service shell if available.
6. Run:

```bash
pip install -r requirements.txt
alembic upgrade head
```

If using a Railway one-time job or temporary service:

1. Use the same backend image/repository.
2. Attach the same staging database variable.
3. Run:

```bash
pip install -r requirements.txt && alembic upgrade head
```

4. Confirm success.
5. Remove the temporary job/service after migration completes.

Pass criteria:

- Migration finishes without errors.
- The staging database contains the expected tables.
- Backend health checks pass.

## Manual One-Time Migration Command

Use this only inside a secure provider shell where `HCS_DATABASE_URL` is already set.

```bash
pip install -r requirements.txt
alembic upgrade head
```

Do not run:

```bash
echo $HCS_DATABASE_URL
printenv
env
```

Those commands may expose secrets in logs.

## Verification Endpoints

After migration, restart or redeploy the backend if needed, then verify:

```text
/db/status
/system/health-summary
```

Expected result:

- Backend responds successfully.
- Database is configured.
- System health summary is reachable.
- PostgreSQL ORM and migration modules are visible in status output.

Also verify through staging UI:

- Create a dummy organization.
- Create a dummy membership.
- Create a dummy invitation.
- Register dummy document metadata.
- Create dummy availability.
- Create a dummy appointment request.
- Restart backend.
- Confirm records still appear.

Use dummy data only.

## Rollback Guidance

If migration fails before creating tables:

1. Stop and capture the error message without exposing secrets.
2. Confirm the backend is using staging `HCS_DATABASE_URL`.
3. Confirm Alembic files are deployed.
4. Confirm database connectivity from the provider.
5. Fix the cause and retry.

If migration partially succeeds:

1. Stop staging writes.
2. Do not run repeated manual SQL unless approved.
3. Inspect Alembic version state.
4. Restore the staging database backup if necessary.
5. Re-run `alembic upgrade head` only after the cause is known.

If backend fails after migration:

1. Redeploy the previous backend version.
2. Keep staging traffic paused if data integrity is uncertain.
3. Restore staging database backup if required.
4. Re-run smoke tests before continuing.

Production rollback is not part of this guide because this guide must not be used for production.

## Secret Handling Warning

Never paste these values into chat, screenshots, issue trackers, terminal logs, documentation, or support tickets:

- `DATABASE_URL`
- `HCS_DATABASE_URL`
- PostgreSQL password
- Firebase service account JSON
- `APP_SECRET_KEY`
- Any `.env` file content

If a secret is exposed:

1. Rotate it immediately.
2. Update the hosting provider secret.
3. Restart the backend.
4. Record the incident in the staging decision log.

## Final Safety Check

Before running the migration, confirm:

```text
[ ] This is staging, not production
[ ] HCS_DATABASE_URL is set in provider secrets
[ ] No secret values are printed
[ ] No PHI is being used
[ ] No patient migration is running
[ ] Rollback path is understood
```
