import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform owner
    const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' || 
                           user.email === 'mylvaganam@premierhealthcanada.ca' ||
                           user.is_platform_owner === true;

    if (!isPlatformOwner) {
      return Response.json({ error: 'Forbidden: Platform owner access required' }, { status: 403 });
    }

    const { userId, userEmail, orgId, organizationId, isCompanyAdmin, deleteUser } = await req.json();

    // Accept either userId or userEmail
    let targetUserId = userId;
    
    if (!targetUserId && userEmail) {
      // Find user by email
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (users.length === 0) {
        return Response.json({ error: 'User not found with email: ' + userEmail }, { status: 404 });
      }
      targetUserId = users[0].id;
      console.log('✅ Found user by email:', userEmail, '-> userId:', targetUserId);
    }

    if (!targetUserId) {
      return Response.json({ error: 'userId or userEmail is required' }, { status: 400 });
    }
    
    // Use organizationId if orgId not provided
    const targetOrgId = orgId || organizationId;

    // Handle user deletion
    if (deleteUser) {
      // Delete all UserRole assignments first
      const userRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: targetUserId });
      for (const ur of userRoles) {
        await base44.asServiceRole.entities.UserRole.delete(ur.id);
      }
      // Delete user
      await base44.asServiceRole.entities.User.delete(targetUserId);
      console.log('✅ User deleted successfully');
      return Response.json({ 
        success: true,
        message: 'User deleted successfully'
      });
    }

    // Update user data using service role
    const updateData = {};
    if (targetOrgId) {
      updateData.organization_id = targetOrgId;
      console.log('✅ Setting organization_id to:', targetOrgId);
    }
    if (isCompanyAdmin !== undefined) {
      updateData.is_company_admin = isCompanyAdmin;
    }

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.User.update(targetUserId, updateData);
      console.log('✅ User updated with:', updateData);
    }

    console.log('✅ User updated successfully');

    return Response.json({ 
      success: true,
      message: 'User assigned to organization successfully'
    });
  } catch (error) {
    console.error('❌ Error assigning user:', error);
    return Response.json({ 
      error: error.message || 'Failed to assign user'
    }, { status: 500 });
  }
});