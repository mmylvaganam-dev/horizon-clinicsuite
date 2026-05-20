# Staging Deployment Commands

These are example commands for staging deployment preparation. They do not deploy production and do not migrate patient data.

## Frontend Build

From the repository root:

```bash
npm install
npm run build
```

Expected output directory:

```text
dist
```

## Backend Install

From the repository root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Backend Start

From the `backend` directory:

```bash
source .venv/bin/activate
export HCS_DATABASE_URL=postgresql://USER:PASSWORD@STAGING_DB_HOST:5432/horizon_clinicsuite_staging
uvicorn main:app --host 0.0.0.0 --port 8000
```

For a cloud host, set the same environment variables in the provider dashboard and use:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Alembic Migration

From the repository root:

```bash
export HCS_DATABASE_URL=postgresql://USER:PASSWORD@STAGING_DB_HOST:5432/horizon_clinicsuite_staging
alembic upgrade head
```

Run this against staging only until production go-live is explicitly approved.

## Smoke Testing

Backend tests:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. pytest tests -q
```

Frontend build check:

```bash
cd ..
npm run build
```

Manual staging checks:

```text
https://staging-app.example.lk/firebase-auth-test
https://staging-app.example.lk/app/admin/dashboard
https://staging-app.example.lk/admin-org-test
https://staging-app.example.lk/org-members-test
https://staging-app.example.lk/invitations-test
https://staging-app.example.lk/documents-test
https://staging-app.example.lk/availability-test
https://staging-app.example.lk/appointments-test
https://staging-app.example.lk/system-health-test
```

## Safety Notes

- Do not run these commands against production unless production deployment is approved.
- Do not use real PHI.
- Do not migrate patient data.
- Keep Base44 available as fallback during staging validation.
