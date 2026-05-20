# Known Limitations And Risks

This document records launch constraints for the independent Horizon operational platform.

## Placeholder Persistence Areas

- Placeholder fallback remains active when PostgreSQL is unavailable.
- Local database migration has not been confirmed in this environment because Docker and Alembic were unavailable.
- Audit logs have a persistence path but production audit retention is not complete.
- RBAC depends on correctly seeded PostgreSQL users, memberships, and roles.

## Missing PHIPA-Grade Controls

- Formal privacy impact assessment is not complete.
- Vendor agreements and data residency review are not complete.
- Tamper-resistant audit storage is not complete.
- Emergency access and break-glass workflows are not complete.
- Incident response and breach response runbooks are not fully tested.
- Backup restore evidence is not yet complete.

## Unfinished Clinical Workflows

- Patient EMR is not migrated.
- Clinical charting is not migrated.
- Lab, prescription, consultation, and provider documentation workflows remain Base44-dependent.
- Appointment requests are not full appointments and are not connected to patient charts.

## Unfinished Pharmacy Workflows

- Pharmacy inventory is not migrated.
- Pharmacy sales and dispensing are not migrated.
- Pharmacy billing and audit workflows are not migrated.
- No pharmacy production workflow should be run in the independent platform yet.

## Unsupported Integrations

- No production calendar sync.
- No billing/payment gateway integration.
- No patient portal integration.
- No pharmacy integrations.
- No clinical document ingestion into EMR.
- No automated Google Drive to PostgreSQL production import.

## Deployment Limitations

- Production hosting has not been provisioned.
- Production PostgreSQL has not been deployed.
- Production Alembic migration has not been run.
- Production Firebase Storage rules need final review.
- CI/CD pipeline is not finalized.
- Monitoring and alerting are not complete.

## Recommended Operational Precautions

- Run the independent platform in parallel with Base44 first.
- Use dummy or non-sensitive operational data during initial validation.
- Keep all clinical, pharmacy, billing, and patient chart work in Base44.
- Validate backups daily during the first launch week.
- Review audit logs and access denials daily.
- Stop using a module immediately if persistence, RBAC, or audit behavior is unclear.
