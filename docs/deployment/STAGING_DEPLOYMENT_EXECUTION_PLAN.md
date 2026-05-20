# Staging Deployment Execution Plan

This plan prepares a real staging deployment for Horizon's independent operational platform. It does not deploy production, migrate patient records, or permit real PHI.

## Staging Frontend Hosting

- Deploy the React/Vite frontend to a staging static host.
- Recommended first option: Render Static Site or Vercel preview/staging project.
- Use a staging domain such as `staging-app.example.lk`.
- Set `VITE_USE_FIREBASE_AUTH=true`.
- Point `VITE_BACKEND_BASE_URL` to the staging backend API.

## Staging Backend Hosting

- Deploy FastAPI to a staging backend host.
- Recommended first option: Render Web Service in Singapore region.
- Use a staging API domain such as `staging-api.example.lk`.
- Configure HTTPS.
- Store environment variables in provider secret management.
- Confirm `/health`, `/db/status`, and protected Firebase routes respond.

## Staging PostgreSQL Database

- Create a staging PostgreSQL database separate from local and production.
- Recommended first option: Neon Singapore or Render PostgreSQL.
- Set `HCS_DATABASE_URL` only in the staging backend environment.
- Enable TLS.
- Enable backups if available on the selected tier.
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

1. Provision staging Firebase.
2. Provision staging PostgreSQL.
3. Deploy staging backend.
4. Configure backend environment variables.
5. Run Alembic migrations.
6. Deploy staging frontend.
7. Configure frontend environment variables.
8. Bootstrap staging admin account.
9. Run smoke tests.
10. Record blockers and fixes.
