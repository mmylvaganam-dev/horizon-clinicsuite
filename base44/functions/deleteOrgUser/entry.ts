import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' ||
                           user.email === 'mylvaganam@premierhealthcanada.ca' ||
                           user.is_platform_owner === true;
    const isAdmin = user.role === 'admin';

    if (!isPlatformOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    // Fetch target user via service role
    let targetUser;
    try {
      targetUser = await base44.asServiceRole.entities.User.get(userId);
    } catch (_e) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Org admins can only delete users within their own organization
    if (!isPlatformOwner) {
      if (!user.organization_id) {
        return Response.json({ error: 'Your account has no organization assignment' }, { status: 403 });
      }
      const targetUserRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: userId });
      const targetApprovals = await base44.asServiceRole.entities.UserApproval.filter({ user_email: targetUser.email });

      const belongsToOrg =
        targetUser.organization_id === user.organization_id ||
        targetUserRoles.some(ur => ur.organization_id === user.organization_id) ||
        targetApprovals.some(a => a.organization_id === user.organization_id);

      if (!belongsToOrg) {
        return Response.json({ error: 'Forbidden: You can only delete users in your own organization' }, { status: 403 });
      }
    }

    await base44.asServiceRole.entities.User.delete(userId);
    return Response.json({ success: true, message: 'User deleted' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});