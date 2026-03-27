import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { resultId, accessToken } = body;

    if (!resultId) return Response.json({ error: 'resultId required' }, { status: 400 });

    // Allow access if:
    // 1. Staff user is logged in (internal access), OR
    // 2. A valid accessToken is provided (public QR scan), OR
    // 3. No auth needed — we validate by resultId existence only (public read)
    // We use service role to fetch data in all cases (report is intentionally public via QR)
    const results = await base44.asServiceRole.entities.Result.filter({ id: resultId });
    const result = results[0];
    if (!result) return Response.json({ error: 'Report not found' }, { status: 404 });

    const [entries, orders, patients, brandings] = await Promise.all([
      base44.asServiceRole.entities.LabResultEntry.filter({ result_id: resultId }),
      base44.asServiceRole.entities.Order.filter({ id: result.order_id }),
      base44.asServiceRole.entities.Patient.filter({ id: result.patient_id }),
      base44.asServiceRole.entities.OrganizationBranding.filter({ organization_id: result.organization_id }),
    ]);

    const order = orders[0] || {};
    const patient = patients[0] || {};
    const branding = brandings[0] || {};

    const specimens = await base44.asServiceRole.entities.Specimen.filter({ order_id: result.order_id || '' });
    const specimen = specimens[0] || {};

    const reportData = { result, entries, order, patient, branding, specimen };
    return Response.json({ success: true, reportData });
  } catch (error) {
    console.error('generateLabReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});