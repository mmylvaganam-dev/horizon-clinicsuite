# Horizon Clinical Suite – Base44 Migration Plan

## Purpose
Migrate Horizon Clinical Suite away from Base44 backend dependencies in a safe, staged manner while preserving the existing React frontend.

## Current Architecture
- Frontend: React + Vite in `src/`
- Current backend dependency: Base44 SDK, Base44 entities, Base44 functions
- Current package dependencies include `@base44/sdk` and `@base44/vite-plugin`

## Target Architecture
- Frontend: keep existing React/Vite frontend initially
- Backend: FastAPI
- Database: PostgreSQL
- Storage: cloud object storage, preferably Google Cloud Storage or Firebase Storage
- Authentication: Firebase Auth or equivalent
- AI: OpenAI API through backend only
- Source control: GitHub

## Migration Safety Rules
1. Do not delete Base44 files yet.
2. Do not remove `@base44/sdk` yet.
3. Do not rewrite the whole frontend.
4. Do not move patient-sensitive or business-sensitive production data until the new backend is tested.
5. Build the new backend beside the existing Base44 app first.
6. Migrate one function/entity at a time.
7. All new backend work should happen under `backend/`.
8. Frontend should eventually call the new backend through a small API adapter layer.

## First Milestone
Create a minimal independent backend with:
- `GET /health`
- local development instructions
- requirements file

## Second Milestone
Create a Base44 dependency audit:
- list all imports from `@base44/sdk`
- list all `base44/entities`
- list all `base44/functions`
- identify which screens depend on each function/entity

## Third Milestone
Create backend module structure:
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/api/routes/health.py`
- `backend/app/api/routes/drug_interactions.py`
- `backend/app/models/`
- `backend/app/services/`

## Preferred First Migration Target
Start with a lower-risk function before touching billing, payroll, appointments, pharmacy sales, or clinical records.
Suggested first target:
- `checkDrugInteractions`

## Long-Term Goal
Gradually replace:
- Base44 entities with PostgreSQL tables
- Base44 functions with FastAPI routes/services
- Base44 auth/storage with controlled independent services
- OpenAI calls should only happen server-side, never directly from frontend

## Notes for Codex
Work only on the migration branch unless explicitly instructed otherwise. Make small commits. Do not perform broad rewrites. Preserve existing frontend behavior wherever possible.
