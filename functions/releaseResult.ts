import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { resultId, releaseNote } = payload;

        // Get result for context
        const results = await base44.asServiceRole.entities.Result.filter({ id: resultId });
        const result = results[0];

        if (!result) {
            return Response.json({ error: 'Result not found' }, { status: 404 });
        }

        // Validation: Result must be Signed before release
        if (result.status !== 'Signed') {
            return Response.json({ 
                error: 'Result must be Signed before release',
                current_status: result.status 
            }, { status: 400 });
        }

        // Check if already released
        const existingReleases = await base44.asServiceRole.entities.ReleaseToPatient.filter({ 
            result_id: resultId 
        });

        let release;
        if (existingReleases.length > 0) {
            // Update existing
            release = await base44.asServiceRole.entities.ReleaseToPatient.update(existingReleases[0].id, {
                released: true,
                released_by: user.id,
                released_by_email: user.email,
                released_at: new Date().toISOString(),
                release_note: releaseNote || '',
                portal_visible_from: new Date().toISOString()
            });
        } else {
            // Create new
            release = await base44.asServiceRole.entities.ReleaseToPatient.create({
                result_id: resultId,
                released: true,
                released_by: user.id,
                released_by_email: user.email,
                released_at: new Date().toISOString(),
                release_note: releaseNote || '',
                portal_visible_from: new Date().toISOString()
            });
        }

        // Update result status to Released
        await base44.asServiceRole.entities.Result.update(resultId, { 
            status: 'Released'
        });

        // Audit log with module and patient_ref
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: result.organization_id,
            location_id: result.location_id,
            patient_id: result.patient_id,
            module: result.result_type || 'RESULTS',
            action: 'release_result',
            record_type: 'ReleaseToPatient',
            record_id: release.id,
            metadata: {
                result_id: resultId,
                patient_ref: result.patient_id,
                result_type: result.result_type,
                release_note: releaseNote || '',
                previous_status: result.status
            }
        });

        return Response.json({ release, result: { ...result, status: 'Released' } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});