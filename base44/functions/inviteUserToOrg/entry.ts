import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin or platform owner can invite users
    const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' || 
                           user.email === 'mylvaganam@premierhealthcanada.ca' ||
                           user.is_platform_owner === true;
    const isAdmin = user.role === 'admin';

    if (!isPlatformOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    let { email, organizationId, role = 'user' } = body;

    // Org admins can ONLY invite to their own organization — never another org
    if (!isPlatformOwner) {
      if (!user.organization_id) {
        return Response.json({ error: 'Your account has no organization assignment' }, { status: 403 });
      }
      organizationId = user.organization_id;
    }

    if (!email || !organizationId) {
      return Response.json({ error: 'Email and organizationId required' }, { status: 400 });
    }

    console.log('🔵 Inviting user:', email, 'to org:', organizationId);

    // Step 1: Invite user via Base44 (creates their account)
    await base44.users.inviteUser(email, role);
    console.log('✅ User invited');

    // Step 2: Wait a moment for user creation to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Find the newly created user by email using service role
    const users = await base44.asServiceRole.entities.User.filter({ email });
    let targetUserId = users.length > 0 ? users[0].id : null;

    if (targetUserId) {
      // Step 4: Assign organization directly using service role (no permission check needed)
      await base44.asServiceRole.entities.User.update(targetUserId, {
        organization_id: organizationId
      });
      console.log('✅ User assigned to org:', organizationId);

      // Step 5: Auto-create an APPROVED UserApproval record so they can log in immediately
      // Check if one already exists
      const existingApprovals = await base44.asServiceRole.entities.UserApproval.filter({ 
        user_email: email,
        organization_id: organizationId
      });

      if (existingApprovals.length === 0) {
        await base44.asServiceRole.entities.UserApproval.create({
          user_email: email,
          organization_id: organizationId,
          org_admin_status: 'approved',
          org_admin_approved_by: user.email,
          org_admin_approved_date: new Date().toISOString(),
          platform_owner_status: 'approved',
          platform_owner_approved_by: user.email,
          platform_owner_approved_date: new Date().toISOString(),
          final_status: 'approved',
        });
        console.log('✅ UserApproval auto-created as approved');
      }
    } else {
      console.log('⚠️ User not found yet after invite - will be assigned when they first log in');
      // Still create a pending approval record keyed by email
      // so it can be matched when they register
      const existingApprovals = await base44.asServiceRole.entities.UserApproval.filter({ 
        user_email: email,
        organization_id: organizationId
      });
      if (existingApprovals.length === 0) {
        await base44.asServiceRole.entities.UserApproval.create({
          user_email: email,
          organization_id: organizationId,
          org_admin_status: 'approved',
          org_admin_approved_by: user.email,
          org_admin_approved_date: new Date().toISOString(),
          platform_owner_status: 'approved',
          platform_owner_approved_by: user.email,
          platform_owner_approved_date: new Date().toISOString(),
          final_status: 'approved',
        });
      }
    }

    return Response.json({
      success: true,
      message: `User ${email} invited and assigned to organization. They can log in immediately after accepting the invite email.`,
    });
  } catch (error) {
    console.error('❌ Error inviting user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});