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
https://premier-horizon-suite.web.app/firebase-auth-test
https://premier-horizon-suite.web.app/app/admin/dashboard
https://premier-horizon-suite.web.app/admin-org-test
https://premier-horizon-suite.web.app/org-members-test
https://premier-horizon-suite.web.app/invitations-test
https://premier-horizon-suite.web.app/documents-test
https://premier-horizon-suite.web.app/availability-test
https://premier-horizon-suite.web.app/appointments-test
https://premier-horizon-suite.web.app/system-health-test
```

## Safety Notes

- Do not run these commands against production unless production deployment is approved.
- Do not use real PHI.
- Do not migrate patient data.
- Keep Base44 available as fallback during staging validation.
