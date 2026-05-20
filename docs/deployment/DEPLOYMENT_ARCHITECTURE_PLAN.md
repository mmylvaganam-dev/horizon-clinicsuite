# Deployment Architecture Plan

This plan describes a safe deployment architecture for the independent Horizon operational platform. It does not deploy production infrastructure.

## Recommended Architecture

- Frontend: static React build hosted on a managed frontend platform with HTTPS and CDN.
- Backend: FastAPI deployed as a containerized service behind HTTPS.
- Database: managed PostgreSQL with TLS, automated backups, point-in-time recovery, and private networking where possible.
- Authentication: Firebase Auth for user identity and ID token issuance.
- File storage: Firebase Storage for uploaded files and documents.
- Authorization: FastAPI verifies Firebase ID tokens and applies PostgreSQL-backed app user, organization membership, and RBAC checks.

## Frontend Hosting Options

- Vercel or Netlify for fast static deployment and preview environments.
- Firebase Hosting if keeping frontend close to Firebase Auth and Storage.
- AWS Amplify, CloudFront plus S3, Azure Static Web Apps, or Google Cloud Hosting for cloud-provider alignment.

Recommended first production path: managed static hosting with preview deployments, custom domain, HTTPS, and environment-specific variables.

## Backend Deployment Options

- Render, Railway, Fly.io, or Google Cloud Run for early production container deployment.
- AWS ECS/Fargate, Azure Container Apps, or Kubernetes for larger operational maturity.
- Use health checks, structured logs, autoscaling policy, and deployment rollback support.

Recommended first production path: containerized FastAPI on a managed container platform with HTTPS, secret manager integration, and simple rollback.

## PostgreSQL Hosting

- Managed PostgreSQL is required for production.
- Candidate providers include Neon, Supabase, AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL, or Render PostgreSQL.
- Production requirements:
  - TLS connections
  - automated backups
  - point-in-time recovery
  - monitoring and alerting
  - separate staging and production instances
  - migration process with review and rollback

## Firebase Integration Architecture

1. User signs in through Firebase Auth in the frontend.
2. Frontend obtains Firebase ID token.
3. Frontend sends token to FastAPI as `Authorization: Bearer <token>`.
4. FastAPI verifies token using Firebase Admin SDK.
5. FastAPI links Firebase identity to PostgreSQL app user.
6. FastAPI resolves organization membership and roles.
7. FastAPI returns only authorized operational data.

## CDN And Storage Flow

- Frontend assets are served through CDN-backed static hosting.
- Firebase Storage stores uploaded files and documents.
- Frontend may upload directly to Firebase Storage only where rules and metadata registration are enforced.
- Backend stores document metadata in PostgreSQL.
- Production file access should use private rules and controlled download flows, not public permanent links.

## Scaling Recommendations

- Start with one frontend static deployment, one backend service, one managed PostgreSQL database, and one Firebase project per environment.
- Scale backend horizontally after adding stateless deployment and shared logging.
- Add database connection pooling before traffic grows.
- Add read replicas only after real workload patterns justify them.
- Add queue-based background jobs for file scanning, exports, notifications, and migration tasks.

## Dev, Staging, And Production Environments

## Development

- Local frontend and backend.
- Development Firebase project.
- Local or disposable PostgreSQL.
- Test-only storage bucket.

## Staging

- Production-like hosting.
- Staging Firebase project.
- Staging PostgreSQL.
- Non-production or anonymized data only.
- Used for migration dry-runs, security review, and release acceptance.

## Production

- Production Firebase project.
- Production PostgreSQL.
- Production storage bucket.
- Locked-down secrets and CORS.
- Monitored services.
- Manual deployment approvals.
- Formal rollback plan.

## Deployment Sequence

1. Provision staging Firebase, PostgreSQL, backend, and frontend.
2. Configure secrets and environment variables.
3. Run backend tests and frontend build in CI.
4. Deploy staging.
5. Verify Firebase login, protected routes, RBAC, profile, documents, audit, availability, appointments, and system health.
6. Run security review and backup restore test.
7. Provision production.
8. Deploy feature-flagged production shell without migrating clinical workflows.
9. Migrate low-risk operational modules one at a time after approval.
