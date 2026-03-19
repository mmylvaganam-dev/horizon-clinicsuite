import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { organizationId, bundleType, dateFrom, dateTo, notes, exportReason } = await req.json();

        if (!organizationId || !bundleType || !dateFrom || !dateTo || !exportReason?.trim()) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create export request in draft status
        const bundle = await base44.asServiceRole.entities.ExportBundle.create({
            organization_id: organizationId,
            bundle_type: bundleType,
            date_from: dateFrom,
            date_to: dateTo,
            status: 'draft',
            requested_by: user.id,
            requested_by_email: user.email,
            requested_at: new Date().toISOString(),
            export_reason: exportReason,
            notes: notes || ''
        });

        // Audit log for export request
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: organizationId,
            location_id: '',
            patient_id: '',
            module: 'EXPORT_CONTROL',
            action: 'request_export',
            record_type: 'ExportBundle',
            record_id: bundle.id,
            metadata: {
                bundle_type: bundleType,
                date_from: dateFrom,
                date_to: dateTo,
                export_reason: exportReason,
                status: 'draft'
            }
        });

        return Response.json({ 
            bundle,
            message: 'Export request submitted for approval'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});