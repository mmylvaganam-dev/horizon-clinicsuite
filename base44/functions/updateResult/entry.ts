import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { resultId, updateData } = payload;

        // Get current result
        const results = await base44.asServiceRole.entities.Result.filter({ id: resultId });
        const result = results[0];

        if (!result) {
            return Response.json({ error: 'Result not found' }, { status: 404 });
        }

        // CRITICAL: If updating to Closed/Filed status, check for critical flags
        const targetStatus = updateData.status;
        if (targetStatus && (targetStatus === 'Closed' || targetStatus === 'Filed')) {
            // Check for critical flags
            const flags = await base44.asServiceRole.entities.ResultFlag.filter({ 
                result_id: resultId,
                flag_type: 'critical'
            });

            if (flags.length > 0) {
                // Check if acknowledged
                const acks = await base44.asServiceRole.entities.CriticalAck.filter({ 
                    result_id: resultId 
                });

                if (acks.length === 0) {
                    return Response.json({ 
                        error: 'Critical result must be acknowledged before closing',
                        critical_flags: flags.length,
                        status: 'acknowledgement_required'
                    }, { status: 400 });
                }
            }
        }

        // Update the result
        const updatedResult = await base44.asServiceRole.entities.Result.update(resultId, updateData);

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: result.organization_id,
            location_id: result.location_id,
            patient_id: result.patient_id,
            module: 'RESULTS',
            action: 'update',
            record_type: 'Result',
            record_id: resultId,
            metadata: {
                updates: updateData,
                previous_status: result.status
            }
        });

        return Response.json({ result: updatedResult });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});