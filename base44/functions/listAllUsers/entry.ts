import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only platform owners can list all users
    const platformOwnerEmails = [
      'mylvaganam@premierhealthcanada.ca',
      'mmylvaganam@premierhealthcanada.ca'
    ];
    
    if (!platformOwnerEmails.includes(user.email) && !user.is_platform_owner) {
      return Response.json({ error: 'Forbidden: Platform owner access required' }, { status: 403 });
    }

    // Fetch all users using service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Fetch all user roles
    const allUserRoles = await base44.asServiceRole.entities.UserRole.list();
    
    // Fetch all organizations
    const allOrgs = await base44.asServiceRole.entities.Organization.list();
    
    // Fetch blocked users
    const blockedUsers = await base44.asServiceRole.entities.BlockedUser.list();
    const blockedEmails = new Set(blockedUsers.map(b => b.email));
    
    // Fetch user approvals
    const approvals = await base44.asServiceRole.entities.UserApproval.list();
    const approvalMap = {};
    approvals.forEach(a => {
      approvalMap[a.user_email] = a.final_status || a.platform_owner_status;
    });

    // Build organization map
    const orgMap = {};
    allOrgs.forEach(org => {
      orgMap[org.id] = org.name;
    });

    // Map users with their organizations
    const usersWithDetails = allUsers.map(u => {
      const userRoles = allUserRoles.filter(ur => ur.user_id === u.id);
      const orgIds = [...new Set(userRoles.map(ur => ur.organization_id))];
      const orgs = orgIds.map(orgId => orgMap[orgId] || 'Unknown');
      
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        created_date: u.created_date,
        organizations: orgs,
        is_blocked: blockedEmails.has(u.email),
        approval_status: approvalMap[u.email] || 'no_record'
      };
    });

    return Response.json({ 
      total_users: allUsers.length,
      users: usersWithDetails,
      fetched_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});