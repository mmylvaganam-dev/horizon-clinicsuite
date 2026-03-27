import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { resultId } = await req.json();
    if (!resultId) return Response.json({ error: 'resultId required' }, { status: 400 });

    // Fetch result, result entries, order, patient, branding
    const results = await base44.asServiceRole.entities.Result.filter({ id: resultId });
    const result = results[0];
    if (!result) return Response.json({ error: 'Result not found' }, { status: 404 });

    const [entries, orders, patients, brandings] = await Promise.all([
      base44.asServiceRole.entities.LabResultEntry.filter({ result_id: resultId }),
      base44.asServiceRole.entities.Order.filter({ id: result.order_id }),
      base44.asServiceRole.entities.Patient.filter({ id: result.patient_id }),
      base44.asServiceRole.entities.OrganizationBranding.filter({ organization_id: result.organization_id }),
    ]);

    const order = orders[0] || {};
    const patient = patients[0] || {};
    const branding = brandings[0] || {};

    // Fetch specimens
    const specimens = await base44.asServiceRole.entities.Specimen.filter({ order_id: result.order_id || '' });
    const specimen = specimens[0] || {};

    const reportData = {
      result,
      entries,
      order,
      patient,
      branding,
      specimen,
    };

    return Response.json({ success: true, reportData });
  } catch (error) {
    console.error('generateLabReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});