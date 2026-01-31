import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ approved: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Platform owner (no restrictions)
    const platformOwnerEmails = [
      'mylvaganam@premierhealthcanada.ca',
      'mmylvaganam@premierhealthcanada.ca'
    ];
    if (platformOwnerEmails.includes(user.email)) {
      return Response.json({ 
        approved: true, 
        role: 'platform_owner',
        user_email: user.email,
        has_unrestricted_access: true
      });
    }

    // All other authenticated users are approved by default
    return Response.json({ 
      approved: true, 
      role: 'user',
      user_email: user.email 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});