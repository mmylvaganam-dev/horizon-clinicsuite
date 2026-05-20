# Production Environment Variables Template

This template lists required production environment variables for the Google/Firebase-first deployment stack. Values must be stored in Firebase/Google Cloud configuration or Secret Manager, not committed to Git.

## Frontend: Firebase Hosting

Use these during the frontend build:

```text
VITE_USE_FIREBASE_AUTH=true
VITE_BACKEND_BASE_URL=https://api.example.lk
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

Notes:

- Use production Firebase web app config only for production.
- Keep staging and production Firebase projects separate.
- Do not commit real `.env` files.

## Backend: Cloud Run

Set these in Cloud Run environment variables or Secret Manager:

```text
APP_ENV=production
ENVIRONMENT=production
BACKEND_CORS_ORIGINS=https://app.example.lk
HCS_DATABASE_URL=
DATABASE_SSL=true
DATABASE_POOL_MIN=1
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT_MS=10000
DATABASE_STATEMENT_TIMEOUT_MS=30000
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_SERVICE_ACCOUNT_JSON_PATH=
APP_SECRET_KEY=
ALLOWED_HOSTS=app.example.lk,api.example.lk
SESSION_COOKIE_SECURE=true
LOG_LEVEL=info
AUDIT_LOGGING_ENABLED=true
```

## Firebase

```text
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_SERVICE_ACCOUNT_JSON_PATH=
```

Preferred production approach:

- Use a dedicated Cloud Run service account.
- Use Secret Manager for any service account file or private secret.
- Avoid long-lived JSON keys where workload identity or Google-managed identity can be used.
- Keep Firebase Auth and Storage in the production Firebase project only.

## PostgreSQL: Cloud SQL

```text
HCS_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Recommended production settings:

```text
DATABASE_SSL=true
DATABASE_POOL_MIN=1
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT_MS=10000
DATABASE_STATEMENT_TIMEOUT_MS=30000
```

Cloud SQL guidance:

- Use a production Cloud SQL PostgreSQL instance.
- Enable automated backups.
- Enable point-in-time recovery if budget permits.
- Enable deletion protection.
- Keep production database credentials separate from staging.
- Do not paste `HCS_DATABASE_URL` into chat, logs, docs, screenshots, or frontend settings.

## Security

```text
ALLOWED_HOSTS=app.example.lk,api.example.lk
SESSION_COOKIE_SECURE=true
LOG_LEVEL=info
AUDIT_LOGGING_ENABLED=true
```

Additional production controls:

- Restrict CORS to production Firebase Hosting domains.
- Use HTTPS only.
- Configure budget alerts.
- Configure Cloud Logging/Monitoring alerts.
- Rotate secrets before launch.
- Verify Firebase Storage rules before file workflows.

## Environment Separation

Production values must be separate from:

- Development Firebase project.
- Staging Firebase project.
- Development Cloud SQL database.
- Staging Cloud SQL database.
- Local `.env` files.

No real PHI should be entered until production security, backup/restore, audit retention, RBAC, incident response, and PHIPA review are approved.
