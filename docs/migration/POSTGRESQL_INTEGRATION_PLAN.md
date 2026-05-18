# PostgreSQL Integration Plan

This plan defines the first safe PostgreSQL integration step for replacing Base44 gradually. It is documentation only: do not install packages yet, and do not connect a real database yet.

## Current Guardrails

- Do not modify app code as part of this step.
- Do not install PostgreSQL, ORM, migration, or database client packages yet.
- Do not connect to a real database yet.
- Keep Base44 as the active source of truth until the schema, adapter layer, and rollback path are reviewed.
- Introduce PostgreSQL behind environment configuration and service boundaries before moving user-facing workflows.

## Required Environment Variables

The following variables should exist before any database code is enabled:

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | Primary PostgreSQL connection string for application runtime. | `postgresql://user:password@host:5432/horizon_clinicsuite` |
| `DATABASE_SSL` | Enables SSL when connecting to hosted PostgreSQL. | `true` |
| `DATABASE_POOL_MIN` | Minimum database connections held by the app. | `1` |
| `DATABASE_POOL_MAX` | Maximum database connections held by the app. | `10` |
| `DATABASE_CONNECTION_TIMEOUT_MS` | Timeout for establishing a database connection. | `10000` |
| `DATABASE_STATEMENT_TIMEOUT_MS` | Timeout for long-running queries. | `30000` |
| `DATABASE_MIGRATIONS_ENABLED` | Controls whether migrations can run in a given environment. | `false` |
| `POSTGRES_READ_ENABLED` | Feature flag for reading selected data from PostgreSQL. | `false` |
| `POSTGRES_WRITE_ENABLED` | Feature flag for writing selected data to PostgreSQL. | `false` |
| `BASE44_READ_FALLBACK_ENABLED` | Allows reads to fall back to Base44 during rollout. | `true` |
| `BASE44_DUAL_WRITE_ENABLED` | Allows writes to go to Base44 and PostgreSQL during migration. | `false` |
| `AUDIT_LOGS_POSTGRES_ENABLED` | Enables audit log writes to PostgreSQL first, when approved. | `false` |

Secrets must be stored through the deployment platform secret manager, not committed to the repository.

## First Tables

These tables establish identity, authorization, tenancy, and observability before any clinical or operational data is moved.

### `organizations`

Stores tenant or clinic-level ownership boundaries.

Suggested columns:

- `id`
- `base44_id`
- `name`
- `slug`
- `status`
- `metadata`
- `created_at`
- `updated_at`

### `users`

Stores application users independently from Base44 while preserving a mapping back to existing records.

Suggested columns:

- `id`
- `base44_id`
- `email`
- `name`
- `status`
- `last_login_at`
- `metadata`
- `created_at`
- `updated_at`

### `roles`

Stores named permission groups that can be assigned without hard-coding access behavior into user records.

Suggested columns:

- `id`
- `organization_id`
- `name`
- `description`
- `permissions`
- `created_at`
- `updated_at`

### `user_roles`

Stores the many-to-many relationship between users and roles.

Suggested columns:

- `id`
- `user_id`
- `role_id`
- `organization_id`
- `assigned_by_user_id`
- `created_at`

### `audit_logs`

Stores immutable records of sensitive migration events and future high-value application actions.

Suggested columns:

- `id`
- `organization_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `source`
- `metadata`
- `created_at`

## Why These Are Safest First

These tables are the safest first migration target because they define shared platform foundations without immediately moving clinical workflows, scheduling, billing, or patient-facing data. Identity, tenant boundaries, authorization, and audit trails can be introduced behind feature flags and verified alongside Base44 before they become authoritative.

They also give the migration a low-risk proving ground:

- `organizations` defines tenant boundaries before any tenant-owned data moves.
- `users` preserves account mapping without changing user experience immediately.
- `roles` and `user_roles` allow access control to be modeled explicitly before enforcing it.
- `audit_logs` can be written append-only, making it easier to validate PostgreSQL writes without replacing Base44 reads.

## Gradual Base44 Replacement

The migration should happen in controlled phases.

### Phase 1: Document and Model

- Keep Base44 as the runtime source of truth.
- Review the PostgreSQL table model and environment variables.
- Define ID mapping through `base44_id` columns where needed.
- Do not install packages or connect a database.

### Phase 2: Add Infrastructure Behind Flags

- Add database client and migration tooling only after this plan is accepted.
- Keep PostgreSQL reads and writes disabled by default.
- Add health checks that confirm configuration without changing app behavior.

### Phase 3: Dual Write Low-Risk Data

- Start with append-only `audit_logs`.
- Enable dual writes for selected identity and authorization records only after tests exist.
- Continue reading from Base44 while comparing PostgreSQL records in logs or admin-only diagnostics.

### Phase 4: Read From PostgreSQL Behind Fallbacks

- Enable PostgreSQL reads for one bounded area at a time.
- Keep Base44 fallback enabled while verifying parity.
- Track mismatches and disable PostgreSQL reads immediately if results diverge.

### Phase 5: Promote PostgreSQL as Source of Truth

- Promote PostgreSQL only after read parity, write reliability, backups, and rollback procedures are verified.
- Disable Base44 writes after a final consistency check.
- Keep archived Base44 export data available during the stabilization period.

## Rollback Plan

Rollback must be possible at every phase.

- Keep Base44 as the active source of truth until PostgreSQL is explicitly promoted.
- Use feature flags to disable PostgreSQL reads and writes independently.
- If PostgreSQL reads fail, turn off `POSTGRES_READ_ENABLED` and rely on `BASE44_READ_FALLBACK_ENABLED`.
- If PostgreSQL writes fail during dual write, turn off `POSTGRES_WRITE_ENABLED` or `BASE44_DUAL_WRITE_ENABLED` and continue with Base44 only.
- Preserve `base44_id` mappings so records can be reconciled after rollback.
- Treat `audit_logs` as append-only and never delete audit records during rollback.
- Before promotion, verify backups, restore procedure, migration ordering, and production secrets.

## Explicit Non-Goals For This Step

- Do not install packages yet.
- Do not connect a real database yet.
- Do not change application code yet.
- Do not migrate patient, appointment, billing, or clinical data yet.
