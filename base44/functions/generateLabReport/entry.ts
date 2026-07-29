import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { resultId, mobile, billNo } = body;

    if (!resultId) return Response.json({ error: 'resultId required' }, { status: 400 });

    // ── Authorization ───────────────────────────────────────────────
    // A lab report may be viewed by an authenticated clinic user, OR by a
    // public caller who proves ownership with the patient's mobile number +
    // bill/accession number (the same knowledge factors used by findLabReport).
    // A bare resultId is no longer sufficient to fetch PHI — this closes
    // unauthenticated enumeration of patient medical results.
    let authenticated = false;
    try { const u = await base44.auth.me(); if (u) authenticated = true; } catch (_) { /* not authenticated */ }

    if (!authenticated && (!mobile || !billNo)) {
      return Response.json({ error: 'Authentication or patient credentials (mobile + billNo) required' }, { status: 401 });
    }

    const results = await base44.asServiceRole.entities.Result.filter({ id: resultId });
    const result = results[0];
    if (!result) return Response.json({ error: 'Report not found' }, { status: 404 });

    if (!authenticated) {
      const [patients, orders] = await Promise.all([
        base44.asServiceRole.entities.Patient.filter({ id: result.patient_id }),
        base44.asServiceRole.entities.Order.filter({ id: result.order_id }),
      ]);
      const patient = patients[0];
      const order = orders[0];
      const last9 = String(mobile).replace(/[\s\-\+]/g, '').slice(-9);
      const pm = String(patient?.mobile || patient?.phone || '').replace(/[\s\-\+]/g, '');
      const mobileOk = !!pm && pm.endsWith(last9);
      const billOk = !!order && (
        String(order.order_number || '').toLowerCase() === String(billNo).toLowerCase() ||
        String(order.id || '').toLowerCase().startsWith(String(billNo).toLowerCase())
      );
      if (!mobileOk || !billOk) {
        return Response.json({ error: 'Patient credentials do not match this report' }, { status: 403 });
      }
    }

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