# Staging Smoke Test Checklist

Use this checklist after staging frontend, backend, PostgreSQL, and Firebase are configured. Use dummy data only. Do not use real PHI.

## Login

- Firebase staging user can sign in.
- Frontend receives Firebase session.
- Backend accepts Firebase ID token.
- `/auth/protected-me` returns decoded user.
- `/auth/protected-profile` returns linked app user.

## RBAC

- Admin can access `/app/admin/dashboard`.
- Provider can access `/app/provider/dashboard`.
- Viewer can access `/app/viewer/dashboard`.
- Viewer cannot access admin-only modules.
- Admin-only backend routes reject non-admin users.

## Organization Creation

- Admin can create a staging organization.
- Organization appears in list after refresh.
- Organization record persists after backend restart.

## Memberships

- Admin can add a test organization member.
- Admin can activate/deactivate a member.
- Provider/staff/viewer can list members read-only.
- Non-admin users cannot add or update members.

## Invitations

- Admin can create an invitation.
- Admin can list invitations.
- Invited staging user can accept invitation using token.
- Non-admin users cannot create/list invitations.

## Documents

- Test file upload uses staging Firebase Storage only.
- Document metadata registers in PostgreSQL.
- Document list shows registered metadata.
- Viewer cannot register uploads if route policy disallows writes.
- No patient files are uploaded.

## Audit Logs

- Admin action creates audit event.
- Admin can view audit logs.
- Non-admin cannot view audit logs.
- Audit event includes action, resource, user, and timestamp.

## Appointment Requests

- Admin/provider/staff can create dummy appointment request.
- Appointment request list shows created request.
- Status update works with `pending`, `confirmed`, `cancelled`, and `completed`.
- Viewer can list read-only but cannot create or update.
- No real patient scheduling is performed.

## Availability

- Provider can create/update own availability.
- Admin can manage provider availability.
- Provider cannot manage another provider's availability.
- Availability appears in read-only appointment request context.

## Navigation And Routes

- `/app/admin/*` routes load for admin.
- `/app/provider/*` routes load for provider.
- `/app/viewer/*` routes load for viewer.
- Sidebar links route to expected module pages.
- Production Base44 routes remain unchanged.

## Persistence Verification

- Restart backend after creating records.
- Verify organizations still exist.
- Verify memberships still exist.
- Verify invitations still exist.
- Verify document metadata still exists.
- Verify appointment requests still exist.
- Verify audit logs still exist.

## Smoke Test Result

Record each item as:

```text
PASS / FAIL / BLOCKED
```

No production go-live should proceed with unresolved `FAIL` items on RBAC, database persistence, backups, or Firebase token verification.
