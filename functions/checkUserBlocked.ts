import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ blocked: false, reason: null });
        }

        // Check if user is blocked
        const blockedRecords = await base44.asServiceRole.entities.BlockedUser.filter({ 
            email: user.email 
        });

        if (blockedRecords.length > 0) {
            return Response.json({ 
                blocked: true, 
                reason: blockedRecords[0].reason || 'Access denied by platform owner',
                email: user.email
            });
        }

        return Response.json({ blocked: false, reason: null });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});