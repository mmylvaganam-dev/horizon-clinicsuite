import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all existing patients to check PHN uniqueness
    const patients = await base44.asServiceRole.entities.Patient.list();
    
    // Generate unique PHN
    let phn;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      // Generate PHN in format: PHN + 8 random digits
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
      phn = `PHN${randomDigits}`;
      
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