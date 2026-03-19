import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only PLATFORM_OWNER can seed roles
    const userRoles = await base44.entities.UserRole.filter({ user_id: user.id });
    const allRoles = await base44.entities.Role.list();
    const isPlatformOwner = userRoles.some(ur => {
      const role = allRoles.find(r => r.id === ur.role_id);
      return role?.code === 'PLATFORM_OWNER';
    });

    if (!isPlatformOwner) {
      return Response.json({ error: 'Forbidden: PLATFORM_OWNER required' }, { status: 403 });
    }

    const functionalRoles = [
      // Clinical Roles
      { code: 'PHYSICIAN', role_name: 'PHYSICIAN', name: 'Physician', description: 'Medical doctor - full clinical access', is_system_role: true },
      { code: 'NURSE', role_name: 'NURSE', name: 'Nurse', description: 'Nursing staff - patient care', is_system_role: true },
      
      // Diagnostic Roles
      { code: 'LAB_TECH', role_name: 'LAB_TECH', name: 'Lab Technician', description: 'Laboratory technician - sample processing and results', is_system_role: true },
      { code: 'RADIOLOGIST', role_name: 'RADIOLOGIST', name: 'Radiologist', description: 'Radiology specialist - imaging interpretation', is_system_role: true },
      
      // Pharmacy Roles
      { code: 'PHARMACIST', role_name: 'PHARMACIST', name: 'Pharmacist', description: 'Licensed pharmacist - dispensing and inventory', is_system_role: true },
      
      // Administrative Roles
      { code: 'FRONT_DESK_STAFF', role_name: 'FRONT_DESK_STAFF', name: 'Front Desk Staff', description: 'Front desk - appointments, registration, and patient check-in', is_system_role: true },
      { code: 'BILLING_STAFF', role_name: 'BILLING_STAFF', name: 'Billing Staff', description: 'Billing and invoicing - payment processing', is_system_role: true },
      
      // Management Roles
      { code: 'CLINIC_ADMIN_STAFF', role_name: 'CLINIC_ADMIN_STAFF', name: 'Clinic Admin', description: 'System configuration and user management', is_system_role: true },
    ];

    const created = [];
    const existing = [];

    for (const roleData of functionalRoles) {
      const existingRole = allRoles.find(r => r.code === roleData.code || r.role_name === roleData.role_name);
      
      if (existingRole) {
        existing.push(roleData.code);
        // Update existing role to have role_name field
        if (!existingRole.role_name) {
          await base44.asServiceRole.entities.Role.update(existingRole.id, {
            role_name: roleData.role_name
          });
        }
      } else {
        const newRole = await base44.asServiceRole.entities.Role.create({
          code: roleData.code,
          role_name: roleData.role_name,
          name: roleData.name,
          description: roleData.description,
          is_system_role: true,
          organization_id: null,
          status: 'active'
        });
        created.push(roleData.code);

        await base44.asServiceRole.entities.AuditLog.create({
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_email: user.email,
          organization_id: null,
          location_id: null,
          patient_id: null,
          module: 'ADMIN',
          action: 'create_system_role',
          record_type: 'Role',
          record_id: newRole.id,
          metadata: { code: roleData.code, role_name: roleData.role_name, name: roleData.name }
        });
      }
    }

    return Response.json({
      success: true,
      created_count: created.length,
      existing_count: existing.length,
      created_roles: created,
      existing_roles: existing,
      message: `Seeded ${created.length} new functional roles. ${existing.length} roles already exist.`
    });

  } catch (error) {
    console.error('Role seeding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});