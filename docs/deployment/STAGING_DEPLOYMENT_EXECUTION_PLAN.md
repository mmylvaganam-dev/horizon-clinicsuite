# Staging Deployment Execution Plan

This plan prepares a real staging deployment for Horizon's independent operational platform. It does not deploy production, migrate patient records, or permit real PHI.

## Staging Frontend Hosting

- Deploy the React/Vite frontend to Firebase Hosting.
- First staging frontend URL: Firebase default `*.web.app`.
- Current default staging frontend: `https://premier-horizon-suite.web.app`.
- Custom staging frontend domain `https://cs2.premierhorizon.ca` comes later.
- Set `VITE_USE_FIREBASE_AUTH=true`.
- Point `VITE_BACKEND_BASE_URL` to the Cloud Run default `*.run.app` URL first.
- After custom domain setup, point `VITE_BACKEND_BASE_URL` to `https://api-cs2.premierhorizon.ca`.

## Staging Backend Hosting

- Deploy FastAPI to Google Cloud Run.
- First staging backend URL: Cloud Run default `*.run.app`.
- Custom staging backend domain `https://api-cs2.premierhorizon.ca` comes later.
- Use `asia-southeast1` Singapore unless a formal region review changes it.
- Configure HTTPS.
- Store environment variables in Cloud Run secrets or Secret Manager.
- Confirm `/db/status`, `/system/health-summary`, and protected Firebase routes respond.

## Staging PostgreSQL Database

- Create a staging PostgreSQL database separate from local and production.
- Official database: Google Cloud SQL PostgreSQL.
- Use `asia-southeast1` Singapore unless a formal region review changes it.
- Set `HCS_DATABASE_URL` only in Cloud Run secrets or Secret Manager.
- Enable TLS.
- Enable backups.
- Run Alembic migrations in staging before testing workflows.

## Firebase Staging Project Guidance

- Create a separate Firebase project for staging.
- Enable Firebase Auth.
- Add staging frontend domain to Firebase authorized domains.
- Configure Firebase Storage only for staging test files.
- Use staging service account credentials for backend token verification.
- Do not reuse production Firebase credentials.

## Environment Separation

- Use separate frontend project, backend service, PostgreSQL database, Firebase project, and storage bucket for staging.
- Do not connect staging to production Base44, production Firebase, or production database.
- Use non-sensitive internal test accounts.
- Use dummy files and dummy appointment data only.

## Test Admin Account Creation

1. Create a staging Firebase admin user.
2. Run migrations on the staging database.
3. Create or link the Firebase user to a PostgreSQL app user.
4. Add an admin organization membership.
5. Verify `/app/admin/dashboard`.
6. Verify provider, staff, and viewer test accounts cannot access admin-only modules.

## Smoke Test Checklist

- Frontend loads over HTTPS.
- Backend health endpoint responds over HTTPS.
- Firebase login works.
- Backend verifies Firebase token.
- Protected profile loads.
- RBAC route guards work.
- Organization creation persists.
- Membership add/status update persists.
- Invitations create/list/accept.
- Document metadata registration persists.
- Audit logs record admin actions.
- Provider availability create/update/list works.
- Appointment request create/list/status update works.
- System health is visible to admin.

## Rollback Process

- Keep previous frontend build available.
- Keep previous backend deployment available.
- If a staging migration fails, restore staging database from backup or recreate staging database.
- Do not promote staging to production until rollback is tested.
- Document every rollback event and cause.

## Backup Procedure

- Confirm staging PostgreSQL backup capability.
- Take a manual backup before migration testing when supported.
- Export critical staging configuration.
- Verify at least one restore or rebuild path.
- Record backup and restore results in the staging launch log.

## Staging Execution Order

1. Provision staging Firebase/Google Cloud project.
2. Provision Cloud SQL PostgreSQL staging database.
3. Deploy staging backend to Cloud Run.
4. Copy the Cloud Run default `*.run.app` URL.
5. Configure backend environment variables and CORS for the Firebase default frontend URL.
6. Run Alembic migrations.
7. Configure `VITE_BACKEND_BASE_URL` with the Cloud Run default URL.
8. Deploy staging frontend to Firebase Hosting.
9. Test `https://premier-horizon-suite.web.app`.
10. Bootstrap staging admin account.
11. Run smoke tests.
12. Record blockers and fixes.
13. Add custom domains only after default URL smoke tests pass.
