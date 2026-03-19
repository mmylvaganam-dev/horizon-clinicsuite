import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { bundleId, action, notes } = await req.json();

        if (!bundleId || !action) {
            return Response.json({ error: 'Bundle ID and action are required' }, { status: 400 });
        }

        if (!['approve', 'reject'].includes(action)) {
            return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (action === 'reject' && !notes?.trim()) {
            return Response.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        // Get the bundle
        const bundles = await base44.asServiceRole.entities.ExportBundle.filter({ id: bundleId });
        const bundle = bundles[0];

        if (!bundle) {
            return Response.json({ error: 'Bundle not found' }, { status: 404 });
        }

        if (bundle.status !== 'draft') {
            return Response.json({ error: 'Bundle has already been reviewed' }, { status: 400 });
        }

        let updatedBundle;

        if (action === 'approve') {
            // Approve and trigger generation
            updatedBundle = await base44.asServiceRole.entities.ExportBundle.update(bundleId, {
                status: 'approved',
                approved_by: user.id,
                approved_by_email: user.email,
                approved_at: new Date().toISOString(),
                notes: notes || bundle.notes
            });

            // Audit log for approval
            await base44.asServiceRole.entities.AuditLog.create({
                timestamp: new Date().toISOString(),
                user_id: user.id,
                user_email: user.email,
                organization_id: bundle.organization_id,
                location_id: bundle.location_id || '',
                patient_id: '',
                module: 'EXPORT_CONTROL',
                action: 'approve_export',
                record_type: 'ExportBundle',
                record_id: bundleId,
                metadata: {
                    bundle_type: bundle.bundle_type,
                    date_from: bundle.date_from,
                    date_to: bundle.date_to,
                    requested_by: bundle.requested_by_email,
                    export_reason: bundle.export_reason,
                    approval_notes: notes
                }
            });

            // Auto-generate the export
            try {
                const generateResponse = await base44.asServiceRole.functions.invoke('generateExportBundle', {
                    bundleId
                });

                return Response.json({ 
                    bundle: updatedBundle, 
                    generated: true,
                    message: 'Export approved and generated successfully'
                });
            } catch (genError) {
                console.error('Generation error:', genError);
                return Response.json({ 
                    bundle: updatedBundle, 
                    generated: false,
                    message: 'Export approved but generation failed',
                    error: genError.message
                });
            }
        } else {
            // Reject
            updatedBundle = await base44.asServiceRole.entities.ExportBundle.update(bundleId, {
                status: 'rejected',
                approved_by: user.id,
                approved_by_email: user.email,
                approved_at: new Date().toISOString(),
                notes: notes
            });

            // Audit log for rejection
            await base44.asServiceRole.entities.AuditLog.create({
                timestamp: new Date().toISOString(),
                user_id: user.id,
                user_email: user.email,
                organization_id: bundle.organization_id,
                location_id: bundle.location_id || '',
                patient_id: '',
                module: 'EXPORT_CONTROL',
                action: 'reject_export',
                record_type: 'ExportBundle',
                record_id: bundleId,
                metadata: {
                    bundle_type: bundle.bundle_type,
                    date_from: bundle.date_from,
                    date_to: bundle.date_to,
                    requested_by: bundle.requested_by_email,
                    export_reason: bundle.export_reason,
                    rejection_reason: notes
                }
            });

            return Response.json({ 
                bundle: updatedBundle, 
                message: 'Export request rejected'
            });
        }
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});