import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { resultId, updates } = payload;

        // Get existing result for audit
        const existingResults = await base44.asServiceRole.entities.Result.filter({ id: resultId });
        const existingResult = existingResults[0];

        if (!existingResult) {
            return Response.json({ error: 'Result not found' }, { status: 404 });
        }

        // Track who reviewed it
        if (updates.status === 'reviewed' && !updates.reviewed_by) {
            updates.reviewed_by = user.id;
        }

        // Update the result
        const updatedResult = await base44.asServiceRole.entities.Result.update(resultId, updates);

        // Audit status transition if status changed
        if (updates.status && updates.status !== existingResult.status) {
            await base44.asServiceRole.entities.AuditLog.create({
                timestamp: new Date().toISOString(),
                user_id: user.id,
                user_email: user.email,
                organization_id: existingResult.organization_id || '',
                location_id: existingResult.location_id || '',
                patient_id: existingResult.patient_id,
                module: 'RESULTS',
                action: 'status_transition',
                record_type: 'Result',
                record_id: resultId,
                metadata: {
                    previous_status: existingResult.status,
                    new_status: updates.status
                }
            });
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: existingResult.organization_id,
            location_id: existingResult.location_id,
            patient_id: existingResult.patient_id,
            module: 'RESULTS',
            action: 'update',
            record_type: 'Result',
            record_id: resultId,
            metadata: {
                updates,
                previous_status: existingResult.status,
                new_status: updates.status || existingResult.status
            }
        });

        return Response.json({ result: updatedResult });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});