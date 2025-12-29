import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { resultId, comments } = payload;

        // Get result for context
        const results = await base44.asServiceRole.entities.Result.filter({ id: resultId });
        const result = results[0];

        if (!result) {
            return Response.json({ error: 'Result not found' }, { status: 404 });
        }

        // Validation: Result must be Reviewed before it can be Signed
        if (result.status !== 'Reviewed') {
            return Response.json({ 
                error: 'Result must be in Reviewed status before signing',
                current_status: result.status 
            }, { status: 400 });
        }

        // Create sign-off
        const signOff = await base44.asServiceRole.entities.SignOff.create({
            result_id: resultId,
            signed_by: user.id,
            signed_by_email: user.email,
            signed_at: new Date().toISOString(),
            comments: comments || '',
            signature_metadata: {
                user_agent: req.headers.get('user-agent'),
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
            }
        });

        // Update result status to Signed
        await base44.asServiceRole.entities.Result.update(resultId, { 
            status: 'Signed'
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: result.organization_id,
            location_id: result.location_id,
            patient_id: result.patient_id,
            module: 'RESULTS',
            action: 'sign',
            record_type: 'Result',
            record_id: resultId,
            metadata: {
                comments,
                sign_off_id: signOff.id,
                previous_status: result.status
            }
        });

        return Response.json({ signOff, result: { ...result, status: 'Signed' } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});