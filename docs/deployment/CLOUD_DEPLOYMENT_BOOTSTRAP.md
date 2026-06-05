# Cloud Deployment Bootstrap

This document defines the official Google/Firebase-first deployment architecture for Horizon. It does not deploy production services, use PHI, or migrate patient data.

## Official Deployment Stack

- Frontend: Firebase Hosting
- Authentication: Firebase Auth
- File storage: Firebase Storage
- Backend: Google Cloud Run running FastAPI
- Database: Google Cloud SQL for PostgreSQL
- Secrets: Google Secret Manager or Cloud Run environment secrets
- Logs/monitoring: Cloud Logging, Cloud Monitoring, and Firebase/Google Cloud alerts

This keeps Horizon inside one Google ecosystem, aligns with the Firebase Auth and Storage work already implemented, and reduces operational drift across unrelated hosting providers.

## Firebase Project Separation

Use separate Firebase/Google Cloud projects:

```text
horizon-dev
horizon-staging
horizon-production
```

Each environment must have separate:

- Firebase Auth users.
- Firebase Storage bucket.
- Cloud Run service.
- Cloud SQL PostgreSQL instance or database.
- Secrets.
- Authorized domains.
- Billing alerts.
- IAM/service accounts.

Never share production Firebase credentials, Cloud SQL credentials, or Storage buckets with development or staging.

## Frontend: Firebase Hosting

Firebase Hosting is the official frontend host.

Initial setup:

```bash
firebase init hosting
```

Recommended answers:

```text
Public directory: dist
Configure as single-page app: yes
Set up automatic builds and deploys: optional
Overwrite index.html: no
```

Build and deploy:

```bash
npm ci
npm run build
firebase deploy --only hosting
```

Environment notes:

- Use `VITE_USE_FIREBASE_AUTH=true` for staging and production.
- Use environment-specific Firebase web config.
- Set `VITE_BACKEND_BASE_URL` to the matching Cloud Run default `*.run.app` URL first.
- Move to custom API domains only after default URL smoke tests pass.
- Do not commit real `.env` files.

## Backend: Google Cloud Run

Cloud Run is the official backend host for FastAPI.

Recommended staging deploy command:

```bash
gcloud run deploy horizon-api-staging \
  --source backend \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars APP_ENV=staging,ENVIRONMENT=staging
```

Recommended production deploy command:

```bash
gcloud run deploy horizon-api-production \
  --source backend \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars APP_ENV=production,ENVIRONMENT=production
```

Use `asia-southeast1` Singapore unless a formal data residency or latency review chooses another region.

Runtime guidance:

- Use Cloud Run service account with least privilege.
- Store secrets in Secret Manager.
- Restrict CORS to Firebase Hosting domains.
- Set minimum instances to `0` for low-cost staging.
- Consider minimum instances `1` for production if cold starts are unacceptable.
- Keep backend and Cloud SQL in the same region.

## Database: Cloud SQL PostgreSQL

Cloud SQL PostgreSQL is the official database.

Staging:

- Small Cloud SQL PostgreSQL instance.
- Singapore region.
- Automated backups enabled.
- Deletion protection optional but recommended after validation.
- No PHI.

Production:

- Dedicated production Cloud SQL PostgreSQL instance.
- Automated backups enabled.
- Point-in-time recovery enabled if budget permits.
- Deletion protection enabled.
- Separate production credentials.
- Maintenance window configured.
- Restore test completed before real operational use.

Connection options:

- Preferred production path: Cloud SQL connector or private connection.
- Acceptable staging path: public IP with strict controls, strong password, SSL, and limited authorized access.
- Avoid exposing database credentials outside Cloud Run/Secret Manager.

Migration command:

```bash
alembic upgrade head
```

Run migrations first in staging. Do not run production migrations until staging persistence and rollback are verified.

## Firebase Storage

Use Firebase Storage for files, documents, and backups only. Do not use Firebase Storage as the only store for structured app data.

Rules:

- Separate dev/staging/prod buckets.
- Private by default.
- Test uploads only in staging.
- No PHI until storage rules, audit retention, access review, backup, and incident response are approved.

## DNS And HTTPS

Recommended domains:

```text
cs.premierhorizon.ca
api.cs.premierhorizon.ca
cs2.premierhorizon.ca
api-cs2.premierhorizon.ca
```

- Firebase Hosting provides HTTPS for frontend domains.
- Cloud Run provides HTTPS for service URLs and supports custom domains/load balancing.
- Restrict backend CORS to approved Firebase Hosting domains.
- Enable HSTS only after domain setup is stable.
- First staging deploy should use the Firebase default `*.web.app` URL and Cloud Run default `*.run.app` URL.
- Add `cs2.premierhorizon.ca` and `api-cs2.premierhorizon.ca` only after default URL smoke tests pass.

## Estimated Monthly Cost

Planning estimate for a small Sri Lanka clinic with low patient volume and low concurrency:

- Firebase Hosting: often near USD $0 for low traffic, usage-based beyond free quotas.
- Firebase Auth email/password: usually low/no cost for basic email/password usage; confirm current Firebase pricing before launch.
- Firebase Storage: usage-based storage, operations, and bandwidth; early staging often low.
- Cloud Run: roughly USD $0-$30/month for low traffic with minimum instances at `0`; more if keeping instances warm.
- Cloud SQL PostgreSQL: usually the largest fixed cost, roughly USD $25-$120+/month depending on instance size, storage, backups, and availability settings.
- Cloud Logging/Monitoring/Artifact Registry/Cloud Build: usually low initially but must be watched with budgets.

Expected ranges:

- Staging: USD $25-$80/month.
- Small production clinic, low concurrency: USD $60-$180/month.
- More resilient production with stronger database sizing/backups/min instances: USD $150-$350+/month.

These are planning ranges only. Confirm in Google Cloud Billing Calculator and set budgets before deployment.

## Scaling Path

1. Start with Firebase Hosting, one Cloud Run service, one Cloud SQL staging database, and one Firebase staging project.
2. Validate Firebase Auth, RBAC, persistence, audit logs, file upload, and rollback.
3. Create separate production project/resources.
4. Enable production Cloud SQL backups and restore testing.
5. Add Cloud Monitoring alerts and budget alerts.
6. Add background workers for file scanning, notifications, and migration jobs only when needed.
7. Increase Cloud Run memory/CPU and Cloud SQL size based on measured usage.

## Optional Alternatives

Vercel, Render, Railway, and Neon may remain useful for demos or emergency staging experiments, but they are no longer the primary Horizon deployment recommendation.

Do not use any stack for real PHI until PHIPA/security review, backup/restore, audit retention, storage rules, RBAC, monitoring, and incident recovery are approved.
