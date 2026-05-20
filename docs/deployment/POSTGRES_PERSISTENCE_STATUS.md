# PostgreSQL Persistence Status

This document records the first real PostgreSQL persistence integration phase. It does not authorize production database deployment or patient data migration.

## Database Configuration

- Primary database environment variable: `HCS_DATABASE_URL`.
- Legacy fallback still accepted: `DATABASE_URL`.
- SQLAlchemy engine and session factory are configured in `backend/app/db/session.py`.
- `get_db()` provides the dependency injection pattern for future route-level session dependencies.
- `backend/app/db/base.py` defines the shared SQLAlchemy declarative base.
- `backend/app/db/models/__init__.py` imports all current ORM models so Alembic can discover metadata.

## Alembic Scaffold

- Alembic configuration scaffold created:
  - `alembic.ini`
  - `backend/alembic/env.py`
  - `backend/alembic/script.py.mako`
  - `backend/alembic/versions/`
- Alembic was added to backend requirements.
- No production migration was generated or run.
- Alembic requires `HCS_DATABASE_URL` before migration commands are executed.

## Modules With PostgreSQL Persistence Paths

These modules now use SQLAlchemy persistence when `HCS_DATABASE_URL` is configured and the database is reachable:

- Organizations
- Organization memberships
- Invitations
- Document metadata
- Appointment requests

These modules keep safe placeholder fallback behavior if the database is unavailable:

- Organizations
- Organization memberships
- Invitations
- Document metadata
- Appointment requests

## Modules Still Using Placeholder Or Partial Persistence

- Audit logs: SQLAlchemy persistence path exists, but production audit retention and tamper resistance are not complete.
- RBAC: role lookup uses PostgreSQL when available, but production role assignment review is still required.
- Provider availability: PostgreSQL persistence path exists, but not part of this phase's conversion list.
- Profiles and Firebase-linked users: persistence path exists, but production user migration is not complete.
- Patient, clinical, billing, pharmacy, and EMR data: not migrated.

## Migration Safety Notes

- No patient data was migrated.
- No production database was deployed.
- No production migrations were run.
- Placeholder fallback remains active for local development and unavailable database scenarios.
- Staging should be created before production.
- First Alembic revision should be generated only after staging database configuration is approved.
- Backup and rollback procedures must be tested before any production schema migration.

## Current Readiness

Current status: persistence-ready scaffold, not production DB ready.

The application can use real PostgreSQL persistence for the listed operational modules once `HCS_DATABASE_URL` points to a reachable database with the required schema. The next safe step is to create a staging database, generate the first Alembic revision, run it in staging, and verify CRUD flows before considering production.
