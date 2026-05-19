# User Management Replacement Plan

This document audits the current Base44 user-management flow and defines the safe replacement path. It is documentation only and does not change production behavior.

## Audit Summary

Current user management is still deeply coupled to Base44 across the frontend and Base44 functions.

- Frontend files using `base44.auth.me()`: 134
- Base44 function files using `base44.auth.me()`: 120
- Frontend files using Base44 user or role entities: 30
- Frontend files with admin, owner, or role checks: 39

The migration must happen behind feature flags and backend-protected endpoints. Base44 auth should remain active until Firebase Auth, PostgreSQL user records, and backend role checks are verified in parallel.

## Current Base44 Dependencies

### Base44 Auth Usage

Current auth is centered on:

- `src/lib/AuthContext.jsx`
- `src/Layout.jsx`
- `src/api/base44Client.js`
- `src/components/OrganizationProvider.jsx`
- `src/lib/PageNotFound.jsx`
- Many pages and components that call `base44.auth.me()` directly.
- Base44 functions under `base44/functions/*/entry.ts` that call `base44.auth.me()`.

Important behavior:

- `AuthContext` checks Base44 public app settings and calls `base44.auth.me()`.
- `Layout` calls `base44.auth.me()`, handles logout, and performs platform-owner checks.
- `OrganizationProvider` calls `base44.auth.me()` and uses the returned user to determine organization access.
- Many pages query `currentUser` directly with React Query and `base44.auth.me()`.
- Many Base44 functions trust `base44.auth.me()` for server-side user identity.

### Base44 User Entity Usage

Base44 user and role entities are used for staff/user lists, user-role assignment, permissions, cleanup, reporting, and access gates.

Key frontend areas include:

- `src/pages/AdminUsers.jsx`
- `src/pages/OrganizationUserManagement.jsx`
- `src/pages/UserManagement.jsx`
- `src/pages/UnifiedUserManagement.jsx`
- `src/pages/PlatformUserManagement.jsx`
- `src/pages/UserApprovals.jsx`
- `src/pages/AdminPermissionMatrix.jsx`
- `src/pages/AdminPermissions.jsx`
- `src/pages/AdminReports.jsx`
- `src/pages/AdminRoleStandards.jsx`
- `src/pages/AdminSecurityPosture.jsx`
- `src/components/rbac/ModulePermissions.jsx`
- `src/components/rbac/PatientAccessControl.jsx`
- `src/components/OrganizationProvider.jsx`

Common Base44 entities:

- `base44.entities.User`
- `base44.entities.UserRole`
- `base44.entities.Role`
- `base44.entities.RolePermission`
- `base44.entities.UserApproval`

### Pages Dependent on Current User Session

The highest-impact session dependencies are:

- Global shell and auth:
  - `src/lib/AuthContext.jsx`
  - `src/Layout.jsx`
  - `src/components/OrganizationProvider.jsx`
  - `src/components/shared/OrganizationSwitcher.jsx`
- RBAC and patient access:
  - `src/components/rbac/ModulePermissions.jsx`
  - `src/components/rbac/PatientAccessControl.jsx`
  - `src/components/patients/PatientCareAccessManager.jsx`
- Admin and platform areas:
  - `src/pages/Admin.jsx`
  - `src/pages/AdminUsers.jsx`
  - `src/pages/OrganizationUserManagement.jsx`
  - `src/pages/PlatformSettings.jsx`
  - `src/pages/PlatformConfiguration.jsx`
  - `src/pages/PlatformBilling.jsx`
  - `src/pages/PlatformSetup.jsx`
  - `src/pages/PlatformUserManagement.jsx`
  - `src/pages/UnifiedUserManagement.jsx`
  - `src/pages/UserApprovals.jsx`
- Clinical, pharmacy, finance, wholesale, and operations pages that stamp `created_by`, `uploaded_by`, `user_email`, or `organization_id` from `base44.auth.me()`.

### Admin and Role Checks

Admin and role checks are currently mixed across several patterns:

- Direct email checks for platform owner emails.
- `user?.is_platform_owner === true`
- `user?.role === 'admin'`
- `PLATFORM_OWNER`
- `ORG_SUPER_USER`
- `APP_ADMIN`
- Role lookup through `base44.entities.UserRole` and `base44.entities.Role`.
- Module permission checks through role names and role permission entities.

High-impact files:

- `src/Layout.jsx`
- `src/api/base44Client.js`
- `src/components/OrganizationProvider.jsx`
- `src/components/rbac/ModulePermissions.jsx`
- `src/components/rbac/PatientAccessControl.jsx`
- `src/pages/Admin.jsx`
- `src/pages/AdminUsers.jsx`
- `src/pages/OrganizationUserManagement.jsx`
- `src/pages/PlatformSettings.jsx`
- `src/pages/PlatformConfiguration.jsx`
- `src/pages/AppAdministration.jsx`
- `src/pages/UserApprovals.jsx`
- `src/pages/BlockedUsers.jsx`
- `src/pages/BankStatementManager.jsx`
- `src/pages/PatientAccessRequests.jsx`

### Base44 Current User Helpers

Places using current-user helpers include:

- React Query calls with `queryKey: ['currentUser']` and `queryFn: () => base44.auth.me()`.
- Direct action handlers that call `await base44.auth.me()`.
- Base44 function entrypoints that call `await base44.auth.me()`.
- `base44.auth.logout()`.
- `base44.auth.redirectToLogin()`.
- `base44.auth.updateMe()` in portal-related flows.

These should not be replaced all at once. They should be routed through a compatibility layer first, then gradually moved to protected backend endpoints.

## Replacement Mapping

| Current Base44 dependency | Replacement target |
| --- | --- |
| Base44 auth | Firebase Auth |
| `base44.auth.me()` | Backend `/auth/me` backed by Firebase ID token |
| Base44 user entity | PostgreSQL `User` model |
| Base44 role entities | PostgreSQL `Role` and `UserRole` models |
| Base44 role checks | Protected backend role checks |
| Email-based owner checks | Backend-computed platform owner claim or role |
| `user.role === 'admin'` | Backend role payload from PostgreSQL |
| Base44 function auth | FastAPI protected routes using Firebase token verification |
| Base44 logout/login helpers | Firebase Auth sign-in/sign-out, introduced behind flag |

## Safest Migration Order

1. Keep Base44 auth active.

   Do not replace production login yet. Keep the current Base44 session behavior as the live path.

2. Keep Firebase test routes isolated.

   Continue using `/firebase-test`, `/firebase-auth-test`, `/backend-test`, `/auth/firebase-test`, `/auth/protected-me`, and `/auth/protected-profile` only for diagnostics.

3. Build backend `/auth/me` behind a feature flag.

   The endpoint should verify Firebase token, look up PostgreSQL `User` by `firebase_uid` or `email`, include roles, and return a stable app user payload. It should not be required by production pages until verified.

4. Create an auth compatibility client.

   Add a frontend adapter that can call either Base44 current-user logic or Firebase-backed `/auth/me` depending on a feature flag.

5. Move shared current-user consumers first.

   Start with:

   - `AuthContext`
   - `OrganizationProvider`
   - `ModulePermissions`
   - `PatientAccessControl`
   - `Layout`

6. Move admin/user-management pages next.

   Replace direct Base44 `User`, `UserRole`, `Role`, and `RolePermission` reads with backend endpoints that enforce role checks server-side.

7. Move write workflows later.

   Do not move invite, approve, deactivate, role assignment, or ownership transfer writes until backend role enforcement and audit logging are in place.

8. Move Base44 function behavior last.

   Replace Base44 function auth with FastAPI routes incrementally by workflow area.

9. Disable Base44 auth only after parity is proven.

   Turn off Base44 login only after Firebase Auth, PostgreSQL user profile lookup, backend role checks, and rollback are verified.

## Feature Flag Strategy

Recommended flags:

- `VITE_AUTH_PROVIDER=base44|firebase`
- `VITE_FIREBASE_AUTH_TEST_ENABLED=true|false`
- `VITE_BACKEND_AUTH_ME_ENABLED=true|false`
- `BACKEND_FIREBASE_AUTH_ENABLED=true|false`
- `BACKEND_POSTGRES_USER_LOOKUP_ENABLED=true|false`
- `BACKEND_ROLE_CHECKS_ENABLED=true|false`
- `BASE44_AUTH_FALLBACK_ENABLED=true|false`

Rollout pattern:

1. Default all production environments to Base44.
2. Enable Firebase diagnostics only in development or staging.
3. Enable backend `/auth/me` read-only checks in staging.
4. Compare Base44 user payloads against PostgreSQL/Firebase payloads.
5. Enable Firebase-backed current-user reads for a small admin-only test group.
6. Keep Base44 fallback enabled until parity is proven.
7. Promote feature flags only after audit logs and rollback are tested.

## Rollback Plan

Rollback must be immediate and low risk.

- Keep Base44 auth and Base44 user entities unchanged during migration.
- Keep Base44 login as the default production path until final cutover.
- If Firebase token verification fails, disable Firebase-backed auth flags and return to Base44 current-user flow.
- If PostgreSQL user lookup fails, return `profile_status: "not_linked"` and continue using Base44 for production behavior.
- If role checks are incorrect, disable backend role-check flags and keep Base44 role logic active.
- Preserve `firebase_uid`, `email`, and `base44_id` mappings for reconciliation.
- Do not delete Base44 users, roles, role permissions, or user-role records until rollback is no longer required.
- Keep audit logs for any migrated user/role action.

## PHIPA and Security Notes

- User identity, role assignment, organization membership, and access permissions are sensitive administrative data.
- Do not expose patient data through test auth endpoints.
- Do not commit Firebase service account files, real exports, screenshots, tokens, or patient data.
- Backend role checks must be authoritative before patient or clinical access is moved.
- Any future `/auth/me` response should return only the minimum user and permission data needed by the frontend.
- Audit all role assignment, access approval, and ownership changes.

## Recommended Next Step

Create `/auth/me` behind a feature flag using the existing Firebase token verification and protected profile scaffold:

1. Verify Firebase token.
2. Look up PostgreSQL user by `firebase_uid` or `email`.
3. Return app user plus roles and organization scope.
4. If no PostgreSQL user is linked, return `profile_status: "not_linked"`.
5. Keep all production pages on Base44 until the compatibility layer is ready.
