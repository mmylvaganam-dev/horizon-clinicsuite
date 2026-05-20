# PHIPA Security Gap Analysis

This analysis identifies readiness gaps before Horizon operational modules can safely handle production personal health information. It is not legal advice and should be reviewed with qualified privacy and compliance counsel.

## Completed Security Controls

- Firebase Auth scaffold for independent authentication.
- Backend Firebase ID token verification scaffold.
- Protected FastAPI routes using bearer tokens.
- PostgreSQL app user model and Firebase identity linking scaffold.
- RBAC scaffolds for admin, provider, staff, and viewer roles.
- Audit logging scaffold for selected operational events.
- Firebase Storage scaffold and isolated upload test module.
- Document metadata model separated from file storage.
- Feature flag isolation with `VITE_USE_FIREBASE_AUTH`.
- Production Base44 flows remain unchanged during migration.
- Migration intelligence documents and phased migration planning.

## Missing PHIPA Controls

- Formal privacy impact assessment.
- Vendor agreements and data processing terms for all production providers.
- Confirmed Canadian data residency strategy where required.
- Production-grade audit retention policy.
- Immutable or tamper-resistant audit log storage.
- Complete audit coverage for all PHI access and export events.
- Emergency access and break-glass workflow.
- User access review process.
- Formal incident response plan.
- Backup restore testing evidence.
- Secure file scanning workflow for uploads.
- Production Firebase Storage rules reviewed and tested.
- Production database migration tooling and rollback scripts.
- Centralized monitoring and alerting.
- Secrets rotation process.
- Formal role matrix and least-privilege approval.

## High-Risk Production Gaps

- Patient, clinical, billing, and pharmacy workflows are not ready for production migration.
- Storage upload flow needs production security rules, malware scanning, and controlled downloads before patient documents are handled.
- RBAC exists as a scaffold but needs production role assignment, route-by-route authorization tests, and administrative review.
- Audit logging exists as a scaffold but needs full coverage, retention, and tamper resistance.
- PostgreSQL schema exists as ORM scaffolding but needs production migrations, backup verification, and connection security.
- Browser-tested real Firebase flows need final validation outside restricted in-app browser contexts.

## Recommended Next Security Priorities

1. Finalize production RBAC role matrix.
2. Add database migration tooling and staging database deployment.
3. Write and test production Firebase Storage rules.
4. Add centralized backend logging and monitoring.
5. Expand audit logging coverage and define retention policy.
6. Create incident response and backup restore runbooks.
7. Complete staging deployment and security validation.
8. Perform migration dry-run using non-production or anonymized data.

## PHIPA Readiness Position

Current status: not production-ready for PHI.

The platform has a strong independent foundation for identity, protected routes, RBAC scaffolding, audit scaffolding, storage scaffolding, and operational module migration. Before PHI is migrated, Horizon needs production infrastructure controls, formal compliance review, tested backup and incident procedures, and complete authorization and audit enforcement.
