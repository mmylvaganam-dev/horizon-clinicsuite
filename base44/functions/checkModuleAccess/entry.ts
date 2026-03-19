import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await req.json();
    const { module_code, organization_id } = payload;

    // Core modules are always accessible
    const coreModules = ['DASHBOARD', 'PMS', 'ADMIN', 'REPORTS'];
    if (coreModules.includes(module_code)) {
      return Response.json({ access: true, reason: 'Core module - always accessible' });
    }

    // Get organization's company
    const orgs = await base44.entities.Organization.filter({ id: organization_id });
    if (orgs.length === 0) {
      return Response.json({ access: false, reason: 'Organization not found' });
    }

    const organization = orgs[0];
    const companyId = organization.company_id;

    // Check if module is enabled at company level
    const companyAccess = await base44.entities.CompanyModuleAccess.filter({
      company_id: companyId,
      module_code: module_code,
      is_enabled: true
    });

    if (companyAccess.length === 0) {
      return Response.json({ 
        access: false, 
        reason: 'Module not enabled at company level' 
      });
    }

    // Check if module is enabled at organization level
    const orgAccess = await base44.entities.OrganizationModuleAccess.filter({
      organization_id: organization_id,
      module_code: module_code,
      is_enabled: true
    });

    if (orgAccess.length === 0) {
      return Response.json({ 
        access: false, 
        reason: 'Module not enabled for this organization' 
      });
    }

    return Response.json({ access: true, reason: 'Module enabled' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});