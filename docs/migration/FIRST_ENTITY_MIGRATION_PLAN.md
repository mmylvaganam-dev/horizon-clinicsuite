# First Entity Migration Plan

This plan covers the first real PostgreSQL entity set for the Base44 migration: organizations, users, roles, and user-role assignments. It does not migrate real data yet, remove Base44 entities, or change production frontend behavior.

## Why Users, Roles, and Organizations Are Safest First

Organizations, users, roles, and user-role assignments are the safest first structured entities because they define the application boundary for tenancy, identity, and authorization before clinical or financial workflows move.

These records are foundational but relatively small compared with patient charts, appointments, pharmacy transactions, invoices, and payments. They can be compared against Base44 records, reviewed manually, and rolled back behind feature flags before any patient-facing workflow depends on PostgreSQL.

Starting here also lowers migration risk:

- Organizations define tenant boundaries before tenant-owned operational data is imported.
- Users provide identity mapping across Base44, Firebase Auth, and PostgreSQL.
- Roles make permissions explicit before enforcement moves away from Base44.
- User-role assignments can be validated independently before they control production access.

## Migration Order

1. Export and inventory Base44 organization records.
2. Create PostgreSQL organization rows with `base44_id` mappings.
3. Export and inventory Base44 user records.
4. Create PostgreSQL user rows with `base44_id` and Firebase UID mappings where available.
5. Export and normalize role definitions.
6. Create PostgreSQL role rows, scoped to either platform-level or organization-level access.
7. Export and normalize user-role assignments.
8. Create PostgreSQL user-role rows that reference the migrated user, role, and organization IDs.
9. Validate counts, mappings, and sample records before any read path changes.
10. Enable read-only diagnostics behind a feature flag before production enforcement.

## Rollback Strategy

Rollback must be possible without disrupting Base44 authentication or authorization.

- Keep Base44 as the active source of truth until PostgreSQL parity is proven.
- Keep Base44 entity records unchanged during the first import.
- Store `base44_id` mappings on PostgreSQL rows so imports can be reconciled or discarded.
- Gate all PostgreSQL reads behind feature flags.
- If validation fails, disable PostgreSQL reads and continue using Base44 records.
- If assignments are incorrect, discard the PostgreSQL import batch and re-run from the preserved Base44 exports.
- Do not delete Base44 organizations, users, roles, or assignments until rollback is no longer required.

## PHIPA Considerations

This first entity set is lower risk than patient charts, but it still contains sensitive operational and identity information.

- Limit access to user and role export files to authorized migration staff.
- Do not commit exports, credentials, screenshots, or personally identifying data to the repository.
- Preserve auditability for who imported or reviewed access-control records.
- Validate least-privilege access before any role assignment controls production behavior.
- Treat email addresses, organization memberships, and role assignments as sensitive administrative data.
- Use encrypted transport and approved secret storage for any future database connection.
- Do not migrate patient, appointment, payment, sales, or pharmacy transaction data in this step.
