# Local Environment Requirements

This document explains the tools required to run the Horizon local development database and backend migration workflow. It does not add new application features and does not use production or patient data.

## Required Local Tools

- Docker Desktop
- Python virtual environment
- Node/npm
- Alembic
- PostgreSQL client optional

## Current Blockers

The current local execution environment is missing two required tools:

- `docker command not found`: Docker is not installed or not available on the current `PATH`.
- `alembic not installed in current venv`: the active backend Python virtual environment does not have Alembic installed yet.

Because of these blockers, the local PostgreSQL container could not be started and Alembic migrations could not be run from the current environment.

## Local Machine Setup Commands

Install Docker Desktop:

```bash
# macOS
open https://www.docker.com/products/docker-desktop/
```

From the repository root, create and activate a backend Python virtual environment:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Return to the repository root:

```bash
cd ..
```

Start local PostgreSQL:

```bash
docker compose up -d
```

Run Alembic migrations:

```bash
export HCS_DATABASE_URL=postgresql://horizon:horizon_dev_password@localhost:5432/horizon_clinicsuite_dev
alembic upgrade head
```

Run backend tests:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. pytest tests -q
```

## Optional PostgreSQL Client

A local PostgreSQL client is useful for direct inspection:

```bash
psql postgresql://horizon:horizon_dev_password@localhost:5432/horizon_clinicsuite_dev
```

This is optional. The app and Alembic can run without the `psql` client if Docker and Python dependencies are installed correctly.

## Safety Notes

- Do not use production data locally.
- Do not import patient data.
- Do not connect local development to production Firebase or production storage.
- Keep local credentials development-only.
