# Operational Launch Checklist

This checklist defines a cautious first operational launch path for the independent Horizon platform. It does not approve clinical, pharmacy, billing, or patient-record migration.

## Firebase Readiness

- Use separate Firebase projects for development, staging, and production.
- Confirm Firebase Auth providers are configured and tested.
- Confirm authorized domains match the launch domain.
- Confirm Firebase Storage buckets are environment-specific.
- Review Firebase Storage rules before any real files are uploaded.
- Do not store structured operational data only as Firebase files.

## PostgreSQL Readiness

- Use managed PostgreSQL or local/staging PostgreSQL for non-production launch rehearsals.
- Configure `HCS_DATABASE_URL`.
- Run Alembic migrations in staging before production.
- Verify organizations, memberships, invitations, documents metadata, and appointment requests persist correctly.
- Verify database backups and restore process before production usage.

## Required Environment Variables

- `VITE_USE_FIREBASE_AUTH=true`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`
- `VITE_BACKEND_BASE_URL`
- `HCS_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_SERVICE_ACCOUNT_JSON_PATH`

## Admin Account Setup

- Create the first Firebase admin user.
- Link the Firebase user to a PostgreSQL app user.
- Assign admin membership and admin role.
- Verify `/app/admin/dashboard` access.
- Verify admin-only routes reject provider, staff, and viewer where appropriate.

## Backup Procedures

- Enable PostgreSQL automated backups.
- Run a restore test in staging.
- Confirm Firebase Storage lifecycle and backup approach.
- Export critical configuration before launch.
- Keep Base44 export and backup files unchanged.

## Security Checklist

- Confirm HTTPS for frontend and backend.
- Lock CORS to approved domains.
- Verify Firebase token enforcement on protected routes.
- Verify RBAC guards in backend and frontend.
- Verify audit events for admin changes.
- Rotate development secrets before production.
- Confirm no real `.env` file is committed.

## Rollback Plan

- Keep Base44 as operational fallback during first launch.
- Keep `VITE_USE_FIREBASE_AUTH` feature flag available.
- Roll back frontend by redeploying previous build.
- Roll back backend by redeploying previous backend artifact.
- Roll back database changes only with tested Alembic downgrade or restore plan.

## Staff Onboarding Checklist

- Explain which modules are approved for limited operational use.
- Explain which modules are not approved.
- Train staff to keep clinical and patient charting in Base44 until explicitly migrated.
- Train admins on invitation, membership, and RBAC responsibilities.
- Provide escalation contact for access or data issues.

## Known Limitations

- Not PHIPA-ready for patient clinical data.
- Some persistence paths still fall back to placeholders if the database is unavailable.
- Audit logging is not yet complete enough for full clinical operations.
- Storage upload security requires production rules review before sensitive documents.
- No calendar, billing, pharmacy, or EMR integration is approved.

## Safe Operational Usage Scope

- Internal admin testing.
- Non-patient operational setup.
- Organization and membership rehearsal.
- Invitation workflow rehearsal.
- Non-sensitive document metadata testing.
- Provider availability and appointment request workflow testing with dummy or non-clinical data only.

## Modules Approved For Real Usage

Approved only after staging validation and admin approval:

- Firebase login for internal users.
- Admin/provider/viewer operational shell navigation.
- Organization setup with non-sensitive operational records.
- Membership and invitation management for internal testing.
- Profile management for internal users.
- System health review.

## Modules NOT Approved Yet

- Patient EMR.
- Clinical charting.
- Pharmacy workflows.
- Billing and payment workflows.
- Patient document uploads containing PHI.
- Production appointment booking or calendar sync.
- Automated migration of Base44 patient, clinical, pharmacy, or billing data.
