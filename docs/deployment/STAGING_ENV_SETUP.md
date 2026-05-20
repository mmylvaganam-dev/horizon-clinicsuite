# Staging Environment Setup

This document lists staging environment variables for Horizon deployment rehearsal. Do not use production secrets, real PHI, or patient data.

## Frontend Variables

Use `frontend/.env.staging.example` as the template.

```text
VITE_USE_FIREBASE_AUTH=true
VITE_BACKEND_BASE_URL=https://staging-api.example.lk
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

## Backend Variables

Use `backend/.env.staging.example` as the template.

```text
APP_ENV=staging
ENVIRONMENT=staging
BACKEND_CORS_ORIGINS=https://staging-app.example.lk
HCS_DATABASE_URL=postgresql://USER:PASSWORD@STAGING_DB_HOST:5432/horizon_clinicsuite_staging
DATABASE_SSL=true
DATABASE_POOL_MIN=1
DATABASE_POOL_MAX=5
DATABASE_CONNECTION_TIMEOUT_MS=10000
DATABASE_STATEMENT_TIMEOUT_MS=30000
```

## Firebase Admin Variables

```text
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_SERVICE_ACCOUNT_JSON_PATH=/run/secrets/firebase-service-account.json
```

Use a staging Firebase project and a staging service account only.

## CORS Allowed Origins

```text
BACKEND_CORS_ORIGINS=https://staging-app.example.lk
```

Do not use wildcard CORS in staging once the frontend domain is known.

## App Environment

```text
APP_ENV=staging
ENVIRONMENT=staging
```

These values make logs and configuration clearly identify the staging environment.

## Storage Bucket

```text
VITE_FIREBASE_STORAGE_BUCKET=
FIREBASE_STORAGE_BUCKET=
```

Use a staging bucket. Do not upload patient files or real PHI.

## Security Secrets

```text
ALLOWED_HOSTS=staging-app.example.lk,staging-api.example.lk
SESSION_COOKIE_SECURE=true
LOG_LEVEL=info
AUDIT_LOGGING_ENABLED=true
APP_SECRET_KEY=
```

Generate `APP_SECRET_KEY` in the deployment provider secret manager. Do not commit real secret values.

## Staging Safety Rules

- Use staging Firebase, staging PostgreSQL, and staging storage only.
- Do not reuse production credentials.
- Do not enter patient records.
- Do not upload PHI.
- Validate RBAC before inviting real staff into staging.
