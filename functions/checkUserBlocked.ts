import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ blocked: false });
    }

    // Check if user is in BlockedUsers entity
    const blockedUsers = await base44.asServiceRole.entities.BlockedUsers.filter({ 
      user_email: user.email 
    });

    if (blockedUsers.length > 0) {
      return Response.json({ 
        blocked: true,
        reason: blockedUsers[0].reason 
      });
    }

    return Response.json({ blocked: false });
  } catch (error) {
    console.error('Error checking blocked status:', error);
    return Response.json({ blocked: false });
  }
});