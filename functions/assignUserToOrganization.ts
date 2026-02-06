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

    const { userId, orgId, isCompanyAdmin, deleteUser } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Handle user deletion
    if (deleteUser) {
      // Delete all UserRole assignments first
      const userRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: userId });
      for (const ur of userRoles) {
        await base44.asServiceRole.entities.UserRole.delete(ur.id);
      }
      // Delete user
      await base44.asServiceRole.entities.User.delete(userId);
      console.log('✅ User deleted successfully');
      return Response.json({ 
        success: true,
        message: 'User deleted successfully'
      });
    }

    // Update user data using service role
    const updateData = {};
    if (orgId) {
      updateData.organization_id = orgId;
    }
    if (isCompanyAdmin !== undefined) {
      updateData.is_company_admin = isCompanyAdmin;
    }

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.User.update(userId, updateData);
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