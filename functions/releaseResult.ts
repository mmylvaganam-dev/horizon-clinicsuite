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

        // Ensure result is signed before release
        if (result.status !== 'signed') {
            return Response.json({ error: 'Result must be signed before release' }, { status: 400 });
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

        // Update result status to released
        await base44.asServiceRole.entities.Result.update(resultId, { 
            status: 'released'
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
            action: 'release',
            record_type: 'Result',
            record_id: resultId,
            metadata: {
                release_note: releaseNote,
                release_id: release.id,
                previous_status: result.status
            }
        });

        return Response.json({ release, result: { ...result, status: 'released' } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});