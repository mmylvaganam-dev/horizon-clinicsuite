import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all roles
    const allRoles = await base44.asServiceRole.entities.Role.list();
    
    // Find PLATFORM_OWNER and PHYSICIAN roles
    let platformOwnerRole = allRoles.find(r => r.code === 'PLATFORM_OWNER' || r.name === 'PLATFORM_OWNER');
    let physicianRole = allRoles.find(r => r.code === 'PHYSICIAN' || r.name === 'PHYSICIAN');

    // Create roles if they don't exist
    if (!platformOwnerRole) {
      platformOwnerRole = await base44.asServiceRole.entities.Role.create({
        name: 'PLATFORM_OWNER',
        code: 'PLATFORM_OWNER',
        description: 'Platform owner with full access',
        is_system_role: true,
        status: 'active'
      });
    }

    if (!physicianRole) {
      physicianRole = await base44.asServiceRole.entities.Role.create({
        name: 'PHYSICIAN',
        code: 'PHYSICIAN',
        description: 'Physician with full clinical access',
        is_system_role: true,
        status: 'active'
      });
    }

    // Get user's current roles
    const userRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: user.id });
    
    const hasOwner = userRoles.some(ur => ur.role_id === platformOwnerRole.id);
    const hasPhysician = userRoles.some(ur => ur.role_id === physicianRole.id);

    const assigned = [];

    // Assign PLATFORM_OWNER if not present
    if (!hasOwner) {
      await base44.asServiceRole.entities.UserRole.create({
        user_id: user.id,
        role_id: platformOwnerRole.id
      });
      assigned.push('PLATFORM_OWNER');
    }

    // Assign PHYSICIAN if not present
    if (!hasPhysician) {
      await base44.asServiceRole.entities.UserRole.create({
        user_id: user.id,
        role_id: physicianRole.id
      });
      assigned.push('PHYSICIAN');
    }

    return Response.json({
      success: true,
      user_email: user.email,
      assigned_roles: assigned.length > 0 ? assigned : ['Already had all roles'],
      all_roles: [platformOwnerRole.code, physicianRole.code]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});