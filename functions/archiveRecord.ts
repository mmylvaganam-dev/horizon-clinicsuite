import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { organization_id, patient_ref, record_type, record_id, reason } = payload;

        if (!record_type || !record_id) {
            return Response.json({ error: 'record_type and record_id are required' }, { status: 400 });
        }

        // Check if already archived
        const existingArchives = await base44.asServiceRole.entities.ArchiveRecord.filter({
            record_type,
            record_id
        });

        if (existingArchives.length > 0) {
            return Response.json({ error: 'Record is already archived' }, { status: 400 });
        }

        // Create archive record
        const archive = await base44.asServiceRole.entities.ArchiveRecord.create({
            organization_id: organization_id || '',
            patient_ref: patient_ref || '',
            record_type,
            record_id,
            archived_at: new Date().toISOString(),
            archived_by: user.id,
            archived_by_email: user.email,
            reason: reason || 'Manual archive',
            metadata_json: {
                original_record_type: record_type
            }
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: organization_id || '',
            location_id: '',
            patient_id: patient_ref || '',
            module: 'ARCHIVE',
            action: 'archive_record',
            record_type,
            record_id,
            metadata: {
                reason: reason || 'Manual archive',
                archive_id: archive.id
            }
        });

        return Response.json({ archive });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});