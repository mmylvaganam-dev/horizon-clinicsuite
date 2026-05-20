# Staging Deployment Provider Comparison

This comparison is for Horizon staging only. It does not approve production deployment, real PHI, patient migration, or Base44 replacement.

## Official Recommendation

## Best Immediate Staging Stack

- Frontend: Firebase Hosting
- Backend: Google Cloud Run in `asia-southeast1` Singapore
- PostgreSQL: Google Cloud SQL PostgreSQL in `asia-southeast1` Singapore
- Auth/storage: Firebase Auth and Firebase Storage in the staging Firebase project
- Secrets: Google Secret Manager or Cloud Run secrets

This is now the official Horizon staging stack because it keeps frontend hosting, authentication, storage, backend compute, database, secrets, logs, and monitoring inside the Google/Firebase ecosystem.

## Best Long-Term Production Stack

- Frontend: Firebase Hosting
- Backend: Google Cloud Run
- PostgreSQL: Google Cloud SQL PostgreSQL
- Auth/storage: Firebase Auth and Firebase Storage
- Secrets: Google Secret Manager
- Monitoring: Cloud Logging, Cloud Monitoring, Error Reporting, budget alerts
- Region: `asia-southeast1` Singapore unless a formal review chooses another region

## Provider Matrix

| Provider | Best Use | Ease | Estimated Staging Cost | Sri Lanka Suitability | PostgreSQL Support | Firebase Compatibility | Scaling | Operational Complexity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Firebase Hosting | Official frontend host | Easy | Often near $0 for low staging usage; usage-based beyond quotas | Strong global CDN | No PostgreSQL hosting | Excellent | Excellent static hosting scaling | Low |
| Google Cloud Run | Official FastAPI backend host | Medium | ~$0-$30/month for low traffic if min instances are 0 | Strong with Singapore region | Connects to Cloud SQL | Excellent | Excellent autoscaling | Medium |
| Google Cloud SQL PostgreSQL | Official database | Medium | Often ~$25-$120+/month depending instance, storage, backups | Strong with Singapore region | Native managed PostgreSQL | Excellent in Google Cloud | Vertical scaling, backups, HA options | Medium |
| Railway | Optional prototype alternative | Very easy | ~$5-$25/month for low usage | Good if suitable region exists | Built-in PostgreSQL-style service | Good through env vars | Simple usage-based scaling | Low initially, weaker Google alignment |
| Render | Optional alternative backend/database | Easy | ~$15-$40/month for web service plus database | Strong if Singapore selected | Native Render PostgreSQL | Good through env vars | Manual plan scaling | Low to medium, outside Google stack |
| Vercel | Optional frontend alternative | Very easy | $0 for basic staging, paid plan if team/limits require | Strong global CDN | No native PostgreSQL for this stack | Good for Firebase web config | Excellent frontend scaling | Low for frontend, outside Google stack |

## Firebase Hosting

Firebase Hosting is the official frontend host.

Recommended use:

- Staging and production React/Vite frontend.
- Custom domains and HTTPS.
- One Firebase project per environment.

Deploy:

```bash
firebase init hosting
npm ci
npm run build
firebase deploy --only hosting
```

Risks:

- Build-time environment variables must be correct per environment.
- Backend CORS must match the Firebase Hosting domain.

## Google Cloud Run

Cloud Run is the official backend host.

Recommended use:

- FastAPI backend.
- Staging and production API services.
- Autoscaling low-concurrency clinic workloads.

Deploy:

```bash
gcloud run deploy horizon-api-staging \
  --source backend \
  --region asia-southeast1 \
  --allow-unauthenticated
```

Risks:

- Requires IAM, service account, Cloud SQL connection, and secret management setup.
- Cold starts may occur if minimum instances are `0`.

## Google Cloud SQL PostgreSQL

Cloud SQL PostgreSQL is the official database.

Recommended use:

- Structured operational data.
- Users, roles, organizations, memberships, invitations, document metadata, availability, appointment requests, audit logs.

Guidance:

- Use separate staging and production instances or databases.
- Enable automated backups.
- Enable point-in-time recovery for production if budget permits.
- Keep database credentials in secrets only.

Risks:

- Largest fixed monthly cost in the stack.
- Must verify backups and restore before production go-live.

## Railway

Railway remains an optional prototype alternative only.

Use it for:

- Short demos.
- Non-PHI temporary environments.

Do not treat Railway as the official Horizon production target unless a separate architecture decision is made.

## Render

Render remains an optional backend/database alternative only.

Use it for:

- Temporary staging if Google Cloud setup is blocked.
- Non-PHI testing.

It is no longer the primary recommendation because Horizon is standardizing on Google/Firebase.

## Vercel

Vercel remains an optional frontend alternative only.

Use it for:

- Temporary previews.
- Non-production frontend demos.

Firebase Hosting is now preferred because Horizon already depends on Firebase Auth and Storage.

## Cost Estimate For Google/Firebase Staging

Expected monthly staging cost:

- Firebase Hosting/Auth/Storage: often low for staging usage, usage-based beyond free quotas.
- Cloud Run: roughly $0-$30/month for low traffic with minimum instances at `0`.
- Cloud SQL PostgreSQL: roughly $25-$120+/month depending size, storage, backups, and availability.
- Logging/build/artifact/bandwidth: usually low initially but must be watched.

Planning range:

- Minimal staging: USD $25-$80/month.
- Production-like staging: USD $80-$180/month.

## Cost Estimate For Small Sri Lanka Clinic Production

For low patient volume and low concurrency:

- Firebase Hosting/Auth/Storage: USD $0-$30+/month initially, depending storage and bandwidth.
- Cloud Run: USD $10-$60/month, depending traffic and whether minimum instances are used.
- Cloud SQL PostgreSQL: USD $50-$180+/month depending instance and backup settings.
- Monitoring/logging/build/artifact: USD $0-$30+/month initially.

Planning range:

- Small production launch: USD $60-$180/month.
- Safer production with warmer backend and stronger database settings: USD $150-$350+/month.

Confirm with Google Cloud pricing calculator before launch.

## Sri Lanka Suitability

For Sri Lanka, prioritize Singapore-hosted backend and database services:

- Cloud Run `asia-southeast1` Singapore.
- Cloud SQL `asia-southeast1` Singapore.
- Firebase Hosting global CDN.
- Keep Cloud Run and Cloud SQL in the same region.

## Final Recommendation

Use this order:

1. Firebase staging project.
2. Firebase Hosting for frontend.
3. Cloud SQL PostgreSQL staging database.
4. Cloud Run staging backend.
5. Secret Manager/Cloud Run secrets.
6. Staging smoke tests.
7. Separate production Firebase/GCP project.
8. Production Cloud SQL with backups/restore.
9. Production Cloud Run and Firebase Hosting.

Do not use any provider for real PHI until security controls, backup/restore, PHIPA review, audit retention, storage rules, monitoring, and incident recovery are approved.

## Sources Checked

- Firebase Hosting usage, quotas, and pricing documentation, checked May 19, 2026.
- Firebase pricing page, checked May 19, 2026.
- Google Cloud Run pricing and locations documentation, checked May 19, 2026.
- Google Cloud SQL PostgreSQL pricing and edition documentation, checked May 19, 2026.
