import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { result_id, acknowledgement_note } = payload;

        if (!result_id) {
            return Response.json({ error: 'result_id is required' }, { status: 400 });
        }

        // Get result
        const results = await base44.asServiceRole.entities.Result.filter({ id: result_id });
        const result = results[0];

        if (!result) {
            return Response.json({ error: 'Result not found' }, { status: 404 });
        }

        // Update result to mark as reviewed
        await base44.asServiceRole.entities.Result.update(result_id, {
            reviewed_by: user.id,
            status: 'Reviewed'
        });

        // Create sign-off record
        await base44.asServiceRole.entities.SignOff.create({
            result_id: result_id,
            signoff_type: 'review',
            signed_by: user.id,
            signed_by_email: user.email,
            signed_at: new Date().toISOString(),
            comments: acknowledgement_note || 'Lab results reviewed and acknowledged'
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: result.organization_id || '',
            location_id: result.location_id || '',
            patient_id: result.patient_id,
            module: 'LAB',
            action: 'acknowledge_lab_result',
            record_type: 'Result',
            record_id: result_id,
            metadata: { acknowledgement_note }
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});