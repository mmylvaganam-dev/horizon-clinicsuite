-- Sample non-PHI staging migration rehearsal seed data.
-- Approved for staging rehearsal only.
-- Do not use PHI.
-- Do not run against production.
-- Do not touch production Base44 records.

begin;

insert into organizations (
    id,
    base44_id,
    name,
    slug,
    status,
    metadata_json
) values
(
    '11111111-1111-4111-8111-111111111111',
    'sample-non-phi-org-001',
    'Horizon Sample Clinic Colombo',
    'horizon-sample-clinic-colombo',
    'active',
    '{"sample_seed": true, "non_phi": true, "migration_rehearsal": true}'::jsonb
),
(
    '22222222-2222-4222-8222-222222222222',
    'sample-non-phi-org-002',
    'Horizon Training Branch Kandy',
    'horizon-training-branch-kandy',
    'active',
    '{"sample_seed": true, "non_phi": true, "migration_rehearsal": true}'::jsonb
)
on conflict (id) do nothing;

insert into users (
    id,
    base44_id,
    firebase_uid,
    auth_provider,
    primary_organization_id,
    email,
    first_name,
    last_name,
    name,
    status,
    metadata_json
) values
(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'sample-non-phi-user-admin',
    'sample-firebase-admin-non-phi',
    'firebase',
    '11111111-1111-4111-8111-111111111111',
    'admin.sample@example.com',
    'Aruna',
    'Admin',
    'Aruna Admin',
    'active',
    '{"sample_seed": true, "non_phi": true, "role": "admin"}'::jsonb
),
(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'sample-non-phi-user-provider',
    'sample-firebase-provider-non-phi',
    'firebase',
    '11111111-1111-4111-8111-111111111111',
    'provider.sample@example.com',
    'Nisha',
    'Provider',
    'Nisha Provider',
    'active',
    '{"sample_seed": true, "non_phi": true, "role": "provider"}'::jsonb
),
(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'sample-non-phi-user-staff',
    'sample-firebase-staff-non-phi',
    'firebase',
    '11111111-1111-4111-8111-111111111111',
    'staff.sample@example.com',
    'Kavinda',
    'Staff',
    'Kavinda Staff',
    'active',
    '{"sample_seed": true, "non_phi": true, "role": "staff"}'::jsonb
),
(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'sample-non-phi-user-viewer',
    'sample-firebase-viewer-non-phi',
    'firebase',
    '11111111-1111-4111-8111-111111111111',
    'viewer.sample@example.com',
    'Meena',
    'Viewer',
    'Meena Viewer',
    'active',
    '{"sample_seed": true, "non_phi": true, "role": "viewer"}'::jsonb
)
on conflict (id) do nothing;

insert into roles (
    id,
    base44_id,
    organization_id,
    code,
    name,
    description,
    scope,
    permissions,
    metadata_json
) values
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'sample-non-phi-role-admin',
    '11111111-1111-4111-8111-111111111111',
    'admin',
    'Admin',
    'Sample non-PHI admin role',
    'organization',
    '{"sample": true}'::jsonb,
    '{"sample_seed": true, "non_phi": true}'::jsonb
),
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'sample-non-phi-role-provider',
    '11111111-1111-4111-8111-111111111111',
    'provider',
    'Provider',
    'Sample non-PHI provider role',
    'organization',
    '{"sample": true}'::jsonb,
    '{"sample_seed": true, "non_phi": true}'::jsonb
),
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'sample-non-phi-role-staff',
    '11111111-1111-4111-8111-111111111111',
    'staff',
    'Staff',
    'Sample non-PHI staff role',
    'organization',
    '{"sample": true}'::jsonb,
    '{"sample_seed": true, "non_phi": true}'::jsonb
),
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'sample-non-phi-role-viewer',
    '11111111-1111-4111-8111-111111111111',
    'viewer',
    'Viewer',
    'Sample non-PHI viewer role',
    'organization',
    '{"sample": true}'::jsonb,
    '{"sample_seed": true, "non_phi": true}'::jsonb
)
on conflict (id) do nothing;

insert into user_roles (
    id,
    user_id,
    role_id,
    organization_id,
    assigned_by_user_id,
    metadata_json
) values
(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '{"sample_seed": true, "non_phi": true}'::jsonb
),
(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '{"sample_seed": true, "non_phi": true}'::jsonb
),
(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '{"sample_seed": true, "non_phi": true}'::jsonb
),
(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '{"sample_seed": true, "non_phi": true}'::jsonb
)
on conflict (id) do nothing;

insert into organization_members (
    id,
    organization_id,
    user_id,
    role,
    status,
    invited_by_user_id
) values
(
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'admin',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
),
(
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'provider',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
),
(
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'staff',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
),
(
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'viewer',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
)
on conflict (id) do nothing;

insert into provider_availability (
    id,
    provider_user_id,
    organization_id,
    weekday,
    start_time,
    end_time,
    timezone,
    is_available
) values
(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    1,
    '09:00',
    '12:00',
    'Asia/Colombo',
    true
),
(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    3,
    '14:00',
    '17:00',
    'Asia/Colombo',
    true
)
on conflict (id) do nothing;

insert into appointment_requests (
    id,
    organization_id,
    patient_name,
    patient_email,
    requested_provider_user_id,
    requested_date,
    requested_time,
    request_reason,
    status,
    created_by_user_id
) values
(
    'ffffffff-ffff-4fff-8fff-fffffffffff1',
    '11111111-1111-4111-8111-111111111111',
    'Training Visitor Alpha',
    'visitor.alpha@example.com',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '2026-06-01',
    '09:30',
    'General appointment workflow test',
    'pending',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
),
(
    'ffffffff-ffff-4fff-8fff-fffffffffff2',
    '11111111-1111-4111-8111-111111111111',
    'Training Visitor Beta',
    'visitor.beta@example.com',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '2026-06-03',
    '14:30',
    'Staff training schedule test',
    'confirmed',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
)
on conflict (id) do nothing;

insert into document_metadata (
    id,
    organization_id,
    uploaded_by_user_id,
    file_name,
    storage_path,
    download_url,
    mime_type,
    file_size
) values
(
    '12345678-1234-4234-8234-123456789001',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'sample-training-note.txt',
    'test-uploads/sample-training-note.txt',
    null,
    'text/plain',
    1024
),
(
    '12345678-1234-4234-8234-123456789002',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'sample-operations-checklist.pdf',
    'test-uploads/sample-operations-checklist.pdf',
    null,
    'application/pdf',
    2048
)
on conflict (id) do nothing;

commit;
