# Staging First Deployment Runbook

This runbook describes the first Horizon staging deployment using the official Google/Firebase-first stack. It does not deploy production, approve real PHI, migrate patient data, or replace Base44 production workflows.

## Target Staging Stack

- Frontend: Firebase Hosting
- Authentication: Firebase Auth
- File storage: Firebase Storage
- Backend: Google Cloud Run in `asia-southeast1`
- Database: Google Cloud SQL PostgreSQL in `asia-southeast1`
- Secrets: Google Secret Manager or Cloud Run secrets
- Feature flag: `VITE_USE_FIREBASE_AUTH=true`
- First frontend URL: Firebase default `https://premier-horizon-suite.web.app`
- First backend URL: Cloud Run default `*.run.app`
- Later custom domains: `https://cs2.premierhorizon.ca` and `https://api-cs2.premierhorizon.ca`

## Deployment Order

1. Confirm code freeze.
2. Confirm staging branch and commit.
3. Create or select the staging Firebase/Google Cloud project.
4. Enable Firebase Auth email/password sign-in.
5. Create staging Firebase Storage bucket.
6. Create staging Cloud SQL PostgreSQL instance/database.
7. Create Cloud Run service account.
8. Add staging secrets and environment variables.
9. Deploy backend to Cloud Run.
10. Copy the Cloud Run default `*.run.app` URL.
11. Run Alembic migrations against staging Cloud SQL.
12. Set `VITE_BACKEND_BASE_URL` to the Cloud Run default URL.
13. Initialize Firebase Hosting if needed.
14. Build and deploy frontend to Firebase Hosting.
15. Test `https://premier-horizon-suite.web.app`.
16. Create staging admin login.
17. Run smoke tests.
18. Record result in the staging freeze decision log.
19. Add custom domains only after default URL smoke tests pass.

## Firebase Hosting Deployment

Initialize once:

```bash
firebase init hosting
```

Recommended hosting setup:

```text
Public directory: dist
Single-page app rewrite: yes
Automatic builds: optional
Overwrite index.html: no
```

Build and deploy:

```bash
npm ci
npm run build
firebase use horizon-staging
firebase deploy --only hosting
```

Required staging variables:

```text
VITE_USE_FIREBASE_AUTH=true
VITE_BACKEND_BASE_URL=https://<cloud-run-default-url>
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

After deploy:

- Open the Firebase Hosting staging URL.
- First use `https://premier-horizon-suite.web.app`.
- Confirm routes load.
- Confirm Firebase login works.
- Confirm protected app routes require login.

## Cloud Run Backend Deployment

Recommended staging deploy:

```bash
gcloud run deploy horizon-api-staging \
  --source backend \
  --region asia-southeast1 \
  --allow-unauthenticated
```

Cloud Run startup should run the FastAPI app:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

If using Gunicorn later:

```bash
gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

Use the Gunicorn command only after adding `gunicorn` to backend requirements.

Required backend variables:

```text
APP_ENV=staging
ENVIRONMENT=staging
BACKEND_CORS_ORIGINS=https://premier-horizon-suite.web.app,https://premier-horizon-suite.firebaseapp.com
HCS_DATABASE_URL=<stored secret>
FIREBASE_PROJECT_ID=<staging Firebase project>
FIREBASE_STORAGE_BUCKET=<staging bucket>
FIREBASE_SERVICE_ACCOUNT_JSON_PATH=<mounted secret path>
APP_SECRET_KEY=<stored secret>
```

Service account guidance:

- Use a dedicated Cloud Run service account.
- Grant minimum required permissions.
- Prefer Secret Manager for secrets.
- Avoid broad Owner/Editor roles.
- Keep staging and production service accounts separate.

## Cloud SQL PostgreSQL Setup

Create staging database:

```text
Instance: horizon-postgres-staging
Database: horizon_clinicsuite_staging
Region: asia-southeast1
Backups: enabled
PHI: not allowed
```

Connection guidance:

- Prefer Cloud SQL connector/private connection for production.
- Public IP with strict controls may be acceptable for staging.
- Store connection details only in Cloud Run secrets/environment.
- Do not paste `HCS_DATABASE_URL` into chat, docs, screenshots, or logs.

## Alembic Migration

Run migrations only against staging Cloud SQL:

```bash
pip install -r requirements.txt
alembic upgrade head
```

Verify:

- Migration completes without errors.
- Tables exist in Cloud SQL.
- `/db/status` reports configured database status.
- `/system/health-summary` responds.

## Staging Admin Login Creation

1. Create test admin user in staging Firebase Auth.
2. Sign in through the staging frontend.
3. Confirm `/auth/protected-profile` links the Firebase identity to an app user.
4. Assign or seed admin role using the approved staging-only process.
5. Confirm admin can open `/app/admin/dashboard`.

Do not use real production staff accounts until staging controls are approved.

## Smoke Tests After Deploy

Run these with dummy data only:

- Firebase login.
- `/auth/protected-me`.
- `/auth/protected-profile`.
- `/db/status`.
- `/system/health-summary`.
- Admin dashboard route.
- Provider dashboard route.
- Viewer dashboard route.
- RBAC admin route.
- RBAC provider route.
- Organization create/list.
- Membership add/list/status update.
- Invitation create/list/accept.
- Availability create/list/update.
- Appointment request create/list/status update.
- Test file upload to staging Firebase Storage.
- Document metadata registration/list.
- Audit log view as admin.

## First Persistence Verification

1. Create a staging organization.
2. Add a staging organization member.
3. Create a staging invitation.
4. Register a harmless document metadata record.
5. Create provider availability.
6. Create a dummy appointment request.
7. Restart or redeploy the Cloud Run service.
8. Confirm all records still appear.
9. Record the result in the freeze decision log.

## First Document Upload Verification

Use a harmless text file only:

```text
Horizon staging Firebase Storage test file
```

Verify:

- File uploads to the staging Firebase Storage bucket only.
- File path uses a test folder.
- Download URL is generated.
- Metadata registers in PostgreSQL.
- Audit event is created.
- No patient, business, banking, or PHI file is uploaded.

## Rollback Procedure

Frontend rollback:

1. Roll back to previous Firebase Hosting release.
2. Confirm frontend routes load.
3. Confirm no staging users are blocked.

Backend rollback:

1. Roll back to previous Cloud Run revision.
2. Confirm `/system/health-summary` responds.
3. Confirm Firebase token verification still works.

Database rollback:

1. Stop writes if data integrity is uncertain.
2. Restore staging Cloud SQL backup if required.
3. Re-run migrations only if approved.
4. Re-run smoke tests.

Configuration rollback:

1. Restore previous environment variable values.
2. Restore previous CORS origin list.
3. Restore previous Firebase authorized domains if changed.

## Rollback Triggers

Rollback staging if any of these occur:

- Firebase login fails for all users.
- Backend rejects valid Firebase tokens.
- RBAC allows unauthorized write access.
- PostgreSQL writes fail or disappear.
- Storage rules expose files incorrectly.
- Audit logs fail for admin actions.
- Any real PHI is accidentally entered or uploaded.

## Final Rule

Staging is for operational rehearsal only. Keep Base44 production fallback unchanged until production readiness, PHIPA review, backup/restore, monitoring, incident response, and migration sign-off are complete.
