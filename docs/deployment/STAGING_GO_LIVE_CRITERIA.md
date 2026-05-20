# Staging Go-Live Criteria

This document defines minimum criteria before Horizon's staging deployment can be considered ready for production planning. It does not approve production deployment.

## Minimum Requirements Before Production

- Staging frontend deployed over HTTPS.
- Staging backend deployed over HTTPS.
- Staging PostgreSQL database configured with `HCS_DATABASE_URL`.
- Alembic migrations run successfully in staging.
- Staging Firebase Auth project configured.
- Staging Firebase Storage configured for test-only files.
- Admin, provider, staff, and viewer test accounts validated.
- RBAC guards verified in frontend and backend.
- Smoke test checklist completed.
- Backup and restore path verified.
- Rollback process rehearsed.

## Blocking Risks

Production must not proceed if any of these remain unresolved:

- Firebase token verification fails.
- RBAC allows unauthorized write access.
- PostgreSQL writes do not persist.
- Alembic migration cannot be rerun or rolled back safely.
- Backups are missing or untested.
- Storage rules allow unauthorized access.
- Audit logs fail for admin actions.
- Staff are not trained on approved usage scope.

## Unresolved Clinical Limitations

- Patient EMR is not migrated.
- Clinical charting is not migrated.
- Patient document workflows are not PHI-approved.
- Appointment requests are not full production scheduling.
- No calendar sync is approved.
- No clinical decision support or AI workflow is production-approved.

## Security Review Checklist

- Confirm production secrets are not in Git.
- Confirm staging and production credentials are separate.
- Confirm CORS is restricted to approved frontend domains.
- Confirm HTTPS-only access.
- Confirm Firebase authorized domains.
- Confirm Firebase Storage rules.
- Confirm database TLS.
- Confirm audit logging for admin workflows.
- Confirm role matrix approval.

## Backup Verification

- Staging database backup exists.
- Restore or rebuild process is tested.
- Backup frequency is documented.
- Retention period is documented.
- Owner is assigned for backup checks.

## Rollback Readiness

- Previous frontend build can be redeployed.
- Previous backend artifact can be redeployed.
- Database restore process is documented.
- Base44 fallback remains available.
- Rollback trigger criteria are known to admin users.

## Production Planning Gate

Only after all minimum requirements pass should the team plan production deployment. Even then, production should start with non-clinical operational modules only. Patient, clinical, pharmacy, and billing workflows require separate security, compliance, and migration approvals.
