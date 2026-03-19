import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const platformOwnerEmails = [
      'mylvaganam@premierhealthcanada.ca',
      'mmylvaganam@premierhealthcanada.ca'
    ];
    
    if (platformOwnerEmails.includes(user.email)) {
      return Response.json({ 
        access_level: 'platform_owner',
        can_view_all_organizations: true,
        can_create_organizations: true,
        can_manage_platform: true,
        organization_id: null,
        user_email: user.email
      });
    }

    // For organization users, fetch their role/organization assignment
    const userRoles = await base44.entities.UserRole.filter({ user_id: user.id }, '-created_date');
    
    if (userRoles.length === 0) {
      return Response.json({ 
        access_level: 'guest',
        can_view_all_organizations: false,
        can_create_organizations: false,
        can_manage_platform: false,
        organization_id: null,
        user_email: user.email
      });
    }

    const primaryRole = userRoles.find(r => r.is_primary) || userRoles[0];
    const organization_id = primaryRole.organization_id;

    // Check if user is organization admin/owner
    const role = await base44.entities.Role.filter({ id: primaryRole.role_id });
    const isAdmin = role[0]?.code?.includes('admin') || role[0]?.code?.includes('owner');

    return Response.json({ 
      access_level: isAdmin ? 'organization_admin' : 'organization_user',
      can_view_all_organizations: false,
      can_create_organizations: false,
      can_manage_platform: false,
      organization_id: organization_id,
      user_email: user.email,
      is_admin: isAdmin
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});