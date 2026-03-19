import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await base44.asServiceRole.entities.Organization.list();
    
    return Response.json({
      organizations: orgs.map(o => ({ id: o.id, name: o.name, type: o.type }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});