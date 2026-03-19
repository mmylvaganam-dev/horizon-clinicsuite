import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is PLATFORM_OWNER
    const userRoles = await base44.entities.UserRole.filter({ user_id: user.id });
    const allRoles = await base44.entities.Role.list();
    const isPlatformOwner = userRoles.some(ur => {
      const role = allRoles.find(r => r.id === ur.role_id);
      return role?.role_name === 'PLATFORM_OWNER';
    });

    if (!isPlatformOwner) {
      return Response.json({ error: 'Access denied: PLATFORM_OWNER role required' }, { status: 403 });
    }

    const modules = [
      { code: 'EMR', name: 'Electronic Medical Records', category: 'clinical', is_core: true },
      { code: 'PMS', name: 'Practice Management System', category: 'administrative', is_core: true },
      { code: 'BILLING_FRONTDESK', name: 'Front Desk Billing', category: 'financial', is_core: false },
      { code: 'PHARMACY_POS', name: 'Pharmacy Point of Sale', category: 'financial', is_core: false },
      { code: 'INVENTORY', name: 'Inventory Management', category: 'operational', is_core: false },
      { code: 'LIS_COLLECTING_CENTER', name: 'LIS Collecting Center', category: 'clinical', is_core: false },
      { code: 'LIS_FULL', name: 'LIS Full Laboratory', category: 'clinical', is_core: false },
      { code: 'DIAGNOSTICS_TESTS', name: 'Diagnostic Tests', category: 'clinical', is_core: false },
      { code: 'DIAGNOSTICS_IMAGING', name: 'Diagnostic Imaging', category: 'clinical', is_core: false },
      { code: 'REPORTS', name: 'Reports', category: 'administrative', is_core: true },
      { code: 'ADMIN', name: 'Administration', category: 'administrative', is_core: true },
      { code: 'OWNER_OVERVIEW', name: 'Owner Overview', category: 'administrative', is_core: false }
    ];

    const created = [];
    for (const module of modules) {
      const existing = await base44.asServiceRole.entities.Module.filter({ code: module.code });
      if (existing.length === 0) {
        const newModule = await base44.asServiceRole.entities.Module.create({
          name: module.name,
          code: module.code,
          description: `${module.name} module`,
          category: module.category,
          is_core: module.is_core,
          status: 'active'
        });
        created.push(newModule);

        // Create GlobalModuleAvailability
        await base44.asServiceRole.entities.GlobalModuleAvailability.create({
          module_code: module.code,
          is_globally_enabled: true,
          notes: 'Auto-created during module seeding',
          updated_at: new Date().toISOString(),
          updated_by: user.id,
          updated_by_email: user.email
        });
      }
    }

    return Response.json({
      success: true,
      created: created.length,
      message: `Created ${created.length} new modules`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});