# Final Staging Launch Checklist

This checklist is the final pre-launch gate for the Horizon staging environment. It approves staging validation only. It does not approve production deployment, real PHI, patient migration, clinical use, billing use, or pharmacy use.

## Code Freeze Checklist

- Confirm the staging release branch is selected.
- Confirm all intended staging changes are committed.
- Confirm no unrelated experimental changes are included.
- Confirm backend tests pass.
- Confirm frontend build passes.
- Confirm deployment documentation is current.
- Confirm no real `.env` files or secrets are committed.
- Confirm staging scope is limited to dummy data and non-PHI workflows.
- Confirm no production Base44 flows are replaced by this staging launch.

## Staging Environment Verification

- Staging frontend environment variables are configured.
- Staging backend environment variables are configured.
- `VITE_USE_FIREBASE_AUTH=true` is set for staging.
- Frontend points to the staging backend URL.
- Backend CORS allows only the staging frontend domain.
- Staging Firebase project is separate from production.
- Staging PostgreSQL database is separate from production.
- Staging storage bucket is separate from production.
- Secrets are stored in the hosting provider secret manager.

## Firebase Auth Verification

- Staging Firebase Auth project is active.
- Staging authorized domains include the staging frontend domain.
- Test admin account can sign in.
- Test provider account can sign in.
- Test staff account can sign in.
- Test viewer account can sign in.
- Backend accepts a staging Firebase ID token.
- `/auth/protected-me` returns decoded Firebase user data.
- `/auth/protected-profile` returns linked app user data.

## Firebase Storage Verification

- Staging Firebase Storage bucket is configured.
- Storage rules block unauthenticated access where required.
- Test upload uses harmless dummy files only.
- Uploaded test file appears in the staging bucket.
- Download URL is generated only for the test file.
- No patient files, business files, or banking files are uploaded.

## PostgreSQL Migration Verification

- Staging `HCS_DATABASE_URL` is configured.
- Database connection uses the staging database only.
- Alembic migration command runs successfully.
- Initial operational tables are present.
- Organization records persist after backend restart.
- Membership records persist after backend restart.
- Invitation records persist after backend restart.
- Document metadata persists after backend restart.
- Appointment requests persist after backend restart.
- Audit logs persist after backend restart.

## Backend Health Check

- Backend starts without configuration errors.
- `/db/status` responds.
- `/migration/status` responds.
- `/system/health-summary` responds.
- Protected routes reject requests without a token.
- Protected routes accept valid staging Firebase tokens.
- Server logs show staging environment labels.

## Frontend Route Check

- `/firebase-auth-test` loads.
- `/firebase-test` loads.
- `/app/admin/dashboard` loads for admin.
- `/app/provider/dashboard` loads for provider.
- `/app/viewer/dashboard` loads for viewer.
- `/profile-test` loads under Firebase feature flag.
- `/admin-org-test` loads under Firebase feature flag.
- `/org-members-test` loads under Firebase feature flag.
- `/invitations-test` loads under Firebase feature flag.
- `/documents-test` loads under Firebase feature flag.
- `/audit-test` loads for admin.
- `/availability-test` loads under Firebase feature flag.
- `/appointments-test` loads under Firebase feature flag.
- `/system-health-test` loads for admin.

## RBAC Test

- Admin can access admin dashboard and admin modules.
- Provider can access provider dashboard and permitted modules.
- Staff can access permitted operational modules.
- Viewer can access read-only routes only.
- Viewer cannot create organizations, invitations, documents, or appointment updates.
- Non-admin cannot view audit logs.
- Unauthorized backend requests return `403`.

## Audit Log Test

- Organization creation creates an audit event.
- Profile update creates an audit event.
- Document metadata registration creates an audit event.
- Audit log list shows action type, resource type, user, and timestamp.
- Audit logs are visible to admin only.

## Document Upload Test

- Test file uploads to staging Firebase Storage.
- Backend registers document metadata.
- Document list shows the uploaded test document metadata.
- Viewer remains read-only.
- No PHI or real patient documents are used.

## Appointment Request Test

- Admin/provider/staff can create a dummy appointment request.
- Appointment request list shows created request.
- Status can be changed to `pending`.
- Status can be changed to `confirmed`.
- Status can be changed to `cancelled`.
- Status can be changed to `completed`.
- Viewer cannot create or update appointment requests.
- No real patient appointment is scheduled.

## Availability Test

- Provider can create own availability.
- Provider can update own availability.
- Admin can view organization provider availability.
- Admin can manage provider availability.
- Provider availability appears in appointment request context where available.
- No calendar integration is enabled.

## Rollback Checklist

- Previous frontend build is available for redeploy.
- Previous backend version is available for redeploy.
- Database backup or rebuild process is documented.
- Alembic downgrade or restore strategy is understood before migration.
- Firebase staging configuration can be reverted.
- Staging DNS changes can be rolled back.
- Base44 production fallback remains unchanged.
- Rollback owner is assigned before launch.
- Rollback trigger criteria are agreed before launch.

## Final Staging Launch Decision

Staging launch can proceed only when all critical checks pass:

- Firebase token verification passes.
- PostgreSQL persistence passes.
- RBAC rejects unauthorized writes.
- Audit logs work for admin actions.
- Document upload uses staging storage only.
- Appointment and availability tests use dummy data only.
- Rollback path is ready.

Production remains blocked until separate production readiness, PHIPA, backup, monitoring, and operational approval gates are completed.
