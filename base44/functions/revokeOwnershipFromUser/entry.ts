import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only platform owners can revoke ownership
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email === email);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user to remove platform owner status
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      role: 'user' // Set to regular user role
    });

    // Remove any admin/owner roles from UserRole entity
    const userRoles = await base44.asServiceRole.entities.UserRole.filter({
      user_id: targetUser.id
    });

    // Delete any admin/owner roles, keep only provider/physician roles
    for (const role of userRoles) {
      const roleRecord = await base44.asServiceRole.entities.Role.filter({
        id: role.role_id
      });
      
      if (roleRecord.length > 0) {
        const roleName = roleRecord[0].code || roleRecord[0].name;
        // Delete if it's an admin or owner role
        if (roleName.toLowerCase().includes('admin') || roleName.toLowerCase().includes('owner')) {
          await base44.asServiceRole.entities.UserRole.delete(role.id);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Revoked ownership from ${email}. User now has physician access only.`
    });
  } catch (error) {
    console.error('Error revoking ownership:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});