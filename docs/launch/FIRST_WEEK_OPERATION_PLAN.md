# First Week Operation Plan

This plan describes a cautious first-week operating model for Horizon's independent operational platform. It assumes Base44 remains available as fallback.

## Suggested Parallel-Run Workflow

- Keep Base44 as the system of record.
- Use the independent Horizon platform only for approved operational modules.
- Compare organization, membership, invitation, and profile records against expected internal records.
- Use appointment requests only as scheduling workflow rehearsal, not final patient scheduling.
- Do not enter patient clinical details into the independent platform.

## Base44 Fallback Guidance

- If access control behaves unexpectedly, use Base44.
- If PostgreSQL persistence fails, use Base44.
- If Firebase login fails, use Base44.
- If document access rules are unclear, use Base44.
- If staff are unsure whether a workflow is approved, use Base44.

## Safe Initial Usage Patterns

- Admins validate login and role access.
- Admins create test organizations and memberships.
- Admins test invitation flows with internal users.
- Providers test availability records using non-clinical schedules.
- Staff test appointment request workflow with dummy data only.
- Viewers confirm read-only access.

## Daily Backup Recommendation

- Confirm PostgreSQL automated backups are enabled.
- Confirm the latest backup completed successfully.
- Export critical operational configuration at the end of each day.
- Keep Base44 backup/export files untouched.
- Record backup status in a launch log.

## Monitoring Checklist

- Backend health endpoint responds.
- Firebase login works.
- Protected routes return expected user context.
- RBAC denials are expected and explainable.
- PostgreSQL connection is stable.
- Audit logs are being created for admin actions.
- Firebase Storage rules do not allow unauthorized uploads or downloads.
- Error logs are reviewed daily.

## Rollback Trigger Criteria

Rollback or pause independent platform use if any of the following occur:

- Firebase users cannot sign in.
- Admin users lose access unexpectedly.
- Viewer users can perform write actions.
- PostgreSQL writes fail or data disappears.
- Audit logging fails for admin actions.
- Storage permissions expose files unexpectedly.
- Staff accidentally enter patient clinical data.
- Any PHIPA, privacy, or security concern is raised.

## First Week Success Criteria

- Base44 remains fully available.
- Approved operational modules work in parallel without production disruption.
- No patient clinical data is entered.
- Backups are verified daily.
- RBAC behavior is reviewed daily.
- Issues are logged and resolved before expanding scope.
