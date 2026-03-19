import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { flagData } = payload;

        // Get result for context
        const results = await base44.asServiceRole.entities.Result.filter({ id: flagData.result_id });
        const result = results[0];

        if (!result) {
            return Response.json({ error: 'Result not found' }, { status: 404 });
        }

        // Create the flag
        const flag = await base44.asServiceRole.entities.ResultFlag.create(flagData);

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: result.organization_id,
            location_id: result.location_id,
            patient_id: result.patient_id,
            module: 'RESULTS',
            action: 'create',
            record_type: 'ResultFlag',
            record_id: flag.id,
            metadata: {
                result_id: flagData.result_id,
                flag_type: flagData.flag_type,
                details: flagData.details
            }
        });

        return Response.json({ flag });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});