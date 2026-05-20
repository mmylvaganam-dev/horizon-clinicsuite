# Production Readiness Checklist

This checklist prepares the independent Horizon operational platform for production readiness. It does not authorize production deployment, data migration, or cutover from Base44.

## Firebase Production Setup

- Create separate Firebase projects for development, staging, and production.
- Enable only required Firebase products: Authentication and Storage.
- Configure approved sign-in providers and disable unused providers.
- Restrict authorized domains to approved Horizon domains.
- Configure Firebase Storage rules for authenticated access, role-aware paths, and no public patient or business files.
- Rotate any exposed development keys and verify no real `.env` files are committed.

## PostgreSQL Production Setup

- Provision a managed PostgreSQL instance with encryption at rest.
- Require TLS for database connections.
- Create separate database users for app runtime, migrations, read-only reporting, and backups.
- Apply least-privilege grants.
- Enable automated backups and point-in-time recovery.
- Add migration tooling before production schema changes.

## Secrets Management

- Store secrets in the deployment provider secret manager, not in source control.
- Required secrets include Firebase service account path or JSON, database URL, frontend Firebase config, CORS origins, and operational admin bootstrap values.
- Rotate secrets before production launch.
- Use separate secrets for dev, staging, and production.

## Environment Separation

- Maintain isolated dev, staging, and production environments.
- Use separate Firebase projects and PostgreSQL databases per environment.
- Use separate storage buckets per environment.
- Prevent staging from writing to production systems.
- Require environment labels in logs and monitoring.

## Logging And Monitoring

- Centralize backend logs.
- Capture authentication failures, authorization denials, API errors, database failures, and storage failures.
- Add uptime checks for frontend, backend, database connectivity, Firebase token verification, and storage access.
- Alert on failed login spikes, repeated 403s, database connection errors, and storage permission failures.

## Backup Strategy

- Enable daily automated PostgreSQL backups and point-in-time recovery.
- Define backup retention windows by data class.
- Export Firebase Storage metadata and verify bucket lifecycle policies.
- Test restoration in staging before production launch.
- Document recovery time objective and recovery point objective.

## PHIPA Considerations

- Confirm data residency requirements with legal/compliance counsel.
- Execute required vendor agreements with hosting, database, Firebase, logging, and backup providers.
- Limit collection of personal health information to necessary use cases.
- Ensure role-based access control is enforced on every PHI-bearing route before patient workflows are migrated.
- Maintain audit trails for access, changes, exports, and administrative actions.

## RBAC Review

- Review admin, provider, staff, and viewer permissions before launch.
- Remove placeholder role behavior from production paths.
- Add tests for every production-protected route.
- Ensure viewer role remains read-only.
- Add emergency access policy before clinical workflows.

## Audit Retention

- Define audit retention policy by regulatory and business needs.
- Protect audit logs from user modification.
- Add export and archive process for audit logs.
- Monitor audit logging failures.
- Verify audit events cover authentication, profile updates, organization changes, invitations, documents, scheduling requests, and administrative actions.

## Storage Security

- Store uploaded files in Firebase Storage with private-by-default rules.
- Do not expose permanent public download URLs for sensitive files.
- Use signed or access-controlled download flows for production.
- Add malware scanning process before patient document migration.
- Separate test uploads from production document paths.

## HTTPS And Domain Setup

- Require HTTPS for frontend and backend.
- Configure production CORS to approved origins only.
- Configure HSTS after domain validation.
- Use custom domains for frontend and API.
- Verify Firebase Auth authorized domains match production domains.

## Deployment Environments

- Development: local and disposable test data only.
- Staging: production-like infrastructure with non-production or anonymized data.
- Production: locked secrets, monitored services, approved access, and formal release process.

## CI/CD Recommendations

- Run backend tests on every pull request.
- Run frontend build on every pull request.
- Add linting and type checks after current migration stabilizes.
- Require branch protection on production branches.
- Use manual approval before production deploys.
- Tag releases and keep deployment changelogs.

## Rollback Strategy

- Keep Base44 production flows active until replacement modules pass production readiness checks.
- Deploy new modules behind feature flags.
- Roll back frontend by redeploying the previous build.
- Roll back backend by redeploying the previous container or artifact.
- Roll back database changes only through tested migration rollback scripts.

## Incident Recovery

- Define incident contacts and escalation paths.
- Prepare runbooks for auth outage, database outage, storage outage, leaked secret, and unauthorized access.
- Rehearse restore from backup in staging.
- Track incidents with timestamps, scope, impact, mitigation, and follow-up tasks.

## Production Migration Safeguards

- Do not migrate patient, billing, pharmacy, or clinical records until production RBAC, audit, backup, and monitoring are verified.
- Run migration dry-runs in staging.
- Validate record counts and sample records.
- Keep rollback exports for every migrated dataset.
- Migrate one operational module at a time.
- Require explicit go/no-go approval before production cutover.
