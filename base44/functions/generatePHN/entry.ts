import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get company profile to get company code
    const companies = await base44.asServiceRole.entities.CompanyProfile.list();
    const company = companies[0];
    
    if (!company || !company.company_code) {
      return Response.json({ error: 'Company code not configured' }, { status: 400 });
    }
    
    // Get all existing patients to check PHN uniqueness
    const patients = await base44.asServiceRole.entities.Patient.list();
    
    // Generate unique PHN
    let phn;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      // Generate PHN in format: PHN-COMPANY_CODE-sequential (e.g., PHN-AHC-000001)
      const nextNumber = patients.length + 1;
      phn = `PHN-${company.company_code}-${nextNumber.toString().padStart(6, '0')}`;
      
      // Check if PHN already exists
      isUnique = !patients.some(p => p.phn === phn);
      attempts++;
    }

    if (!isUnique) {
      return Response.json({ error: 'Failed to generate unique PHN' }, { status: 500 });
    }

    return Response.json({ phn });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});