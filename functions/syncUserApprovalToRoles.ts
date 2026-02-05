import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only platform owners can sync approvals
    const platformOwnerEmails = [
      'mylvaganam@premierhealthcanada.ca',
      'mmylvaganam@premierhealthcanada.ca'
    ];
    
    if (!platformOwnerEmails.includes(user.email) && !user.is_platform_owner) {
      return Response.json({ error: 'Forbidden: Platform owner access required' }, { status: 403 });
    }

    const { approval_id } = await req.json();

    if (!approval_id) {
      return Response.json({ error: 'approval_id required' }, { status: 400 });
    }

    // Get the approval record
    const approvals = await base44.asServiceRole.entities.UserApproval.filter({ id: approval_id });
    if (approvals.length === 0) {
      return Response.json({ error: 'Approval not found' }, { status: 404 });
    }

    const approval = approvals[0];

    // Only sync if fully approved
    if (approval.final_status !== 'approved') {
      return Response.json({ error: 'Approval not in approved status' }, { status: 400 });
    }

    // Find the user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: approval.user_email });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Check if UserRole already exists
    const existingRoles = await base44.asServiceRole.entities.UserRole.filter({
      user_id: targetUser.id,
      organization_id: approval.organization_id
    });

    if (existingRoles.length === 0) {
      // Create UserRole with basic user role
      const roles = await base44.asServiceRole.entities.Role.filter({ code: 'user' });
      const userRoleId = roles.length > 0 ? roles[0].id : 'default-user-role';

      await base44.asServiceRole.entities.UserRole.create({
        user_id: targetUser.id,
        role_id: userRoleId,
        organization_id: approval.organization_id,
        is_primary: true,
        valid_from: new Date().toISOString().split('T')[0]
      });
    }

    // Update User.organization_id if not set
    if (!targetUser.organization_id) {
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        organization_id: approval.organization_id
      });
    }

    return Response.json({ 
      success: true,
      message: 'User linked to organization successfully',
      user_id: targetUser.id,
      organization_id: approval.organization_id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});