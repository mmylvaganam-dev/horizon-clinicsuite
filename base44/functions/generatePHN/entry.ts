import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id;

    let companyCode = 'PHN';
    let companyOrgIds = []; // all org IDs belonging to this company

    if (organizationId) {
      // Get the org to find its company
      const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organizationId });
      const org = orgs[0];

      if (org?.company_id) {
        const companies = await base44.asServiceRole.entities.CompanyProfile.filter({ id: org.company_id });
        const company = companies[0];
        if (company?.company_code) {
          companyCode = company.company_code;
        }

        // Get ALL orgs belonging to this company so we only count patients within this company
        const allCompanyOrgs = await base44.asServiceRole.entities.Organization.filter({ company_id: org.company_id });
        companyOrgIds = allCompanyOrgs.map(o => o.id);
      } else {
        companyOrgIds = [organizationId];
      }
    } else {
      // Fallback: use first company
      const companies = await base44.asServiceRole.entities.CompanyProfile.list();
      if (companies[0]?.company_code) {
        companyCode = companies[0].company_code;
      }
    }

    // Get existing patients for this company's orgs only to determine next number
    const prefix = `PHN-${companyCode}-`;

    let patients = [];
    if (companyOrgIds.length > 0) {
      // Fetch patients for each org in this company
      for (const orgId of companyOrgIds) {
        const orgPatients = await base44.asServiceRole.entities.Patient.filter({ organization_id: orgId });
        patients = patients.concat(orgPatients);
      }
    } else {
      // Fallback: search by PHN prefix across all patients
      patients = await base44.asServiceRole.entities.Patient.list();
    }

    // Find the highest PHN number for this company code prefix
    const existingNums = patients
      .filter(p => p.phn?.startsWith(prefix))
      .map(p => parseInt(p.phn.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));

    const nextNumber = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const phn = `${prefix}${nextNumber.toString().padStart(6, '0')}`;

    return Response.json({ phn });
  } catch (error) {
    console.error('generatePHN error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});