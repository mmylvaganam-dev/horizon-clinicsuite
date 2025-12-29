import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { resultData } = payload;

        // Create the result
        const result = await base44.asServiceRole.entities.Result.create({
            ...resultData,
            result_date: resultData.result_date || new Date().toISOString(),
            status: resultData.status || 'pending',
            entered_by: user.id
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: resultData.organization_id,
            location_id: resultData.location_id,
            patient_id: resultData.patient_id,
            module: 'RESULTS',
            action: 'create',
            record_type: 'Result',
            record_id: result.id,
            metadata: {
                result_type: resultData.result_type,
                status: result.status,
                order_id: resultData.order_id
            }
        });

        return Response.json({ result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});