import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Public endpoint: find a patient's lab reports by mobile number + bill/accession number.
 * No authentication required — matches Wayamba's "Find Medical Report" flow.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { mobile, billNo } = await req.json();

    if (!mobile || !billNo) {
      return Response.json({ error: 'Mobile number and Bill No are required' }, { status: 400 });
    }

    // Normalize mobile: strip spaces/dashes, allow last 9 digits match
    const normalizedMobile = mobile.replace(/[\s\-\+]/g, '');
    const last9 = normalizedMobile.slice(-9);

    // Find patient by mobile
    const allPatients = await base44.asServiceRole.entities.Patient.list();
    const patient = allPatients.find(p => {
      const pm = (p.mobile || p.phone || '').replace(/[\s\-\+]/g, '');
      return pm.endsWith(last9);
    });

    if (!patient) {
      return Response.json({ error: 'No patient found with this mobile number' }, { status: 404 });
    }

    // Find order by bill no (accession number or order number)
    const orders = await base44.asServiceRole.entities.Order.filter({ patient_id: patient.id });
    const order = orders.find(o =>
      (o.order_number || '').toLowerCase() === billNo.toLowerCase() ||
      (o.id || '').startsWith(billNo.toLowerCase())
    );

    if (!order) {
      return Response.json({ error: 'No order found with this Bill No for the given patient' }, { status: 404 });
    }

    // Get all lab results for this order
    const results = await base44.asServiceRole.entities.Result.filter({
      order_id: order.id,
      result_type: 'LAB'
    });

    if (!results.length) {
      return Response.json({ error: 'No lab reports found for this order' }, { status: 404 });
    }

    // Return list of results (id + test_name + date + status)
    const reportList = results.map(r => ({
      id: r.id,
      test_name: r.test_name || 'Lab Result',
      result_date: r.result_date,
      status: r.status,
    }));

    return Response.json({
      success: true,
      patient: {
        name: `${patient.first_name} ${patient.last_name}`,
        phn: patient.phn,
      },
      order: {
        order_number: order.order_number || order.id?.substring(0, 8),
      },
      reports: reportList,
    });
  } catch (error) {
    console.error('findLabReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});