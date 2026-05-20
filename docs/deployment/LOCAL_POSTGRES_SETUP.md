# Local PostgreSQL Setup

This setup runs a local PostgreSQL database for development persistence testing only. Do not use production data, patient data, billing data, pharmacy data, or clinical records.

## Start The Database

From the repository root:

```bash
docker compose up -d postgres
```

The local database uses:

```text
Database: horizon_clinicsuite_dev
User: horizon
Password: horizon_dev_password
Port: 5432
```

## Configure The Backend Environment

Use the local example file:

```bash
cp backend/local.env.example backend/.env
```

Expected value:

```text
HCS_DATABASE_URL=postgresql://horizon:horizon_dev_password@localhost:5432/horizon_clinicsuite_dev
```

`backend/.env` is ignored by Git and must not be committed.

## Run Alembic Migrations

Install backend dependencies in your local backend environment:

```bash
pip install -r backend/requirements.txt
```

Run migrations from the repository root:

```bash
export HCS_DATABASE_URL=postgresql://horizon:horizon_dev_password@localhost:5432/horizon_clinicsuite_dev
alembic upgrade head
```

The first migration creates the current operational ORM tables. It does not import production data or patient data.

## Test Persistence

Run backend tests:

```bash
PYTHONPATH=backend pytest backend/tests -q
```

Start the backend with `HCS_DATABASE_URL` configured, then use isolated test pages such as:

- `/admin-org-test`
- `/org-members-test`
- `/invitations-test`
- `/documents-test`
- `/appointments-test`

These pages should use PostgreSQL persistence when the local database is running and migrated.

## Stop The Database

Stop the local database:

```bash
docker compose down
```

Stop and remove the local PostgreSQL volume:

```bash
docker compose down -v
```

Removing the volume deletes local development data only.

## Safety Notes

- Do not use production data.
- Do not import patient records.
- Do not connect this local database to production Firebase or production storage.
- Keep this database isolated for development and migration validation.
