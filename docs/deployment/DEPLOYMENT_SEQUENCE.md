# Deployment Sequence

This sequence prepares Google/Firebase-first staging and production deployment. It does not deploy production automatically, use PHI, or migrate patient data.

## 1. Create Environment Projects

Create separate Google/Firebase projects:

```text
horizon-dev
horizon-staging
horizon-production
```

For each environment, configure separate Firebase Auth, Firebase Storage, Cloud Run, Cloud SQL, secrets, domains, and billing alerts.

## 2. Firebase Hosting Frontend

Use Firebase default `*.web.app` URLs first. Custom domains come later.

Initialize hosting:

```bash
firebase init hosting
```

Build:

```bash
npm ci
npm run build
```

Deploy staging frontend:

```bash
firebase use horizon-staging
firebase deploy --only hosting
```

Production frontend deploy must wait for staging approval.

## 3. Firebase Auth And Storage

For staging:

- Enable Firebase Auth email/password sign-in.
- Add staging Firebase Hosting domain as authorized domain.
- Create staging Firebase Storage bucket.
- Keep Storage rules private and test-only.
- Create staging test users only.

For production:

- Create separate production Firebase project.
- Configure production authorized domains.
- Review Auth and Storage rules before staff use.
- Do not allow PHI until security sign-off.

## 4. Cloud SQL PostgreSQL Setup

Create staging Cloud SQL PostgreSQL:

- Region: `asia-southeast1` Singapore unless formally changed.
- Database: `horizon_clinicsuite_staging`.
- Automated backups enabled.
- No PHI.

Create production Cloud SQL PostgreSQL later:

- Separate instance/database.
- Backups enabled.
- Point-in-time recovery recommended.
- Deletion protection enabled.
- Restore test required before production go-live.

Store the connection string securely as `HCS_DATABASE_URL`. Do not paste it into chat, docs, frontend config, or logs.

## 5. Cloud Run Backend

Use Cloud Run default `*.run.app` URLs first. Custom domains come later.

Deploy staging backend:

```bash
gcloud run deploy horizon-api-staging \
  --source backend \
  --region asia-southeast1 \
  --allow-unauthenticated
```

Set staging environment variables and secrets:

```text
APP_ENV=staging
ENVIRONMENT=staging
BACKEND_CORS_ORIGINS=https://premier-horizon-suite.web.app,https://premier-horizon-suite.firebaseapp.com
HCS_DATABASE_URL=<secret>
FIREBASE_PROJECT_ID=<staging-project>
FIREBASE_STORAGE_BUCKET=<staging-bucket>
FIREBASE_SERVICE_ACCOUNT_JSON_PATH=<mounted-secret-path>
APP_SECRET_KEY=<secret>
```

Service account guidance:

- Use a dedicated Cloud Run service account.
- Grant only required Firebase/Storage/Secret access.
- Avoid broad Owner/Editor roles.
- Store service account JSON through Secret Manager or use workload identity where possible.

## 6. Run Migrations

Run migrations in staging first:

```bash
pip install -r requirements.txt
alembic upgrade head
```

Verify:

- Tables exist.
- `/db/status` responds.
- `/system/health-summary` responds.
- Dummy operational records persist after backend restart.

Run production migrations only after staging approval.

## 7. Admin Bootstrap

- Create first staging Firebase admin user.
- Sign in through Firebase Auth.
- Confirm `/auth/protected-profile` links the app user.
- Create staging organization.
- Assign admin membership through the approved staging path.
- Verify `/app/admin/dashboard`.
- Verify provider/staff/viewer access separately.

## 8. Smoke Testing

Verify with dummy data only:

- Firebase login.
- Protected backend token verification.
- RBAC.
- Organization create/list.
- Membership add/list/status update.
- Invitation create/list/accept.
- Document upload to staging Firebase Storage.
- Document metadata persistence.
- Availability create/list/update.
- Appointment request create/list/status update.
- Audit logs.
- System health dashboard.

## 9. Rollback Strategy

- Keep Base44 production fallback unchanged.
- Keep previous Firebase Hosting release available for rollback.
- Keep previous Cloud Run revision available.
- Keep Cloud SQL backup/restore path documented.
- Use Alembic downgrade only if tested.
- Restore database backup if schema/data rollback is required.
- Stop staging writes if persistence integrity is uncertain.

## Production Go/No-Go

Do not proceed to production if:

- Cloud SQL backups and restore are not verified.
- RBAC tests fail.
- Firebase Storage rules are not reviewed.
- Audit logging and retention are incomplete.
- Monitoring and incident response are missing.
- Staff onboarding is incomplete.
- Any patient/clinical/billing/pharmacy workflow is accidentally included.
