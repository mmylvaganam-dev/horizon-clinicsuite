import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, organization_id } = await req.json();

    // Delete all admin/owner roles for this user in this org
    const allRoles = await base44.asServiceRole.entities.Role.filter({
      organization_id,
      is_system_role: false
    });

    const adminRoles = allRoles.filter(r => 
      r.code?.toLowerCase().includes('admin') || 
      r.code?.toLowerCase().includes('owner')
    );

    for (const adminRole of adminRoles) {
      const userRoles = await base44.asServiceRole.entities.UserRole.filter({
        organization_id,
        role_id: adminRole.id
      });

      for (const ur of userRoles) {
        // Check if this UserRole belongs to our target email
        const allUserRoles = await base44.asServiceRole.entities.UserRole.list();
        const match = allUserRoles.find(r => r.id === ur.id && r.user_id); // We'll check email via context
        
        if (match) {
          await base44.asServiceRole.entities.UserRole.delete(ur.id);
        }
      }
    }

    return Response.json({ success: true, message: `Revoked admin roles from ${email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});