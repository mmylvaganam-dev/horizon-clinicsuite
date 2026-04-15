import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformOwnerEmails = [
      'mylvaganam@premierhealthcanada.ca',
      'mmylvaganam@premierhealthcanada.ca'
    ];
    const isPlatformOwner = platformOwnerEmails.includes(user.email) || user.is_platform_owner;
    const isAdmin = user.role === 'admin';

    if (!isPlatformOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    // For org admins, scope to their organization + users invited to their org
    let filteredUsers = allUsers;
    if (!isPlatformOwner && isAdmin && user.organization_id) {
      const orgApprovals = approvals.filter(a => a.organization_id === user.organization_id);
      const approvedEmails = new Set(orgApprovals.map(a => a.user_email));
      filteredUsers = allUsers.filter(u => 
        u.organization_id === user.organization_id || approvedEmails.has(u.email)
      );
    }

    // Map users with their organizations
    const usersWithDetails = filteredUsers.map(u => {
      const userRoles = allUserRoles.filter(ur => ur.user_id === u.id);
      const orgIds = [...new Set(userRoles.map(ur => ur.organization_id))];
      const orgs = orgIds.map(orgId => orgMap[orgId] || 'Unknown');
      
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        organization_id: u.organization_id,
        created_date: u.created_date,
        organizations: orgs,
        is_blocked: blockedEmails.has(u.email),
        approval_status: approvalMap[u.email] || 'no_record'
      };
    });

    return Response.json({ 
      total_users: filteredUsers.length,
      users: usersWithDetails,
      fetched_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});