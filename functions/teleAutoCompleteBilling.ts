import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Called by entity automation when TeleAppointment is updated to COMPLETED
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { data, old_data, event } = body;

    // Only fire when status transitions to COMPLETED
    if (!data || data.status !== 'COMPLETED' || old_data?.status === 'COMPLETED') {
      return Response.json({ skipped: true });
    }

    const appt = data;

    // Check if billing record already exists
    const existing = await base44.asServiceRole.entities.TeleConsultationBilling.filter({
      tele_appointment_id: appt.id
    });
    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'billing already exists' });
    }

    // Get provider to use their fee if set
    let feeUsd = appt.billing_amount_usd || 50;
    if (appt.provider_id) {
      const providers = await base44.asServiceRole.entities.TeleProvider.filter({ id: appt.provider_id });
      if (providers[0]?.consultation_fee_usd) {
        feeUsd = providers[0].consultation_fee_usd;
      }
    }

    // Skip billing if mode is FREE
    if (appt.billing_mode === 'FREE') {
      feeUsd = 0;
    }

    const now = new Date();
    const consultDate = appt.consultation_ended_at
      ? appt.consultation_ended_at.slice(0, 10)
      : now.toISOString().slice(0, 10);

    let durationMinutes = null;
    if (appt.consultation_started_at && appt.consultation_ended_at) {
      durationMinutes = Math.round(
        (new Date(appt.consultation_ended_at) - new Date(appt.consultation_started_at)) / 60000
      );
    }

    await base44.asServiceRole.entities.TeleConsultationBilling.create({
      organization_id: appt.organization_id,
      tele_appointment_id: appt.id,
      patient_id: appt.patient_id,
      patient_name: appt.patient_name,
      patient_email: appt.patient_email,
      patient_region: appt.patient_region,
      provider_id: appt.provider_id,
      provider_name: appt.provider_name,
      consultation_date: consultDate,
      consultation_started_at: appt.consultation_started_at,
      consultation_ended_at: appt.consultation_ended_at,
      duration_minutes: durationMinutes,
      appointment_type: appt.appointment_type || 'CONSULTATION',
      amount_usd: feeUsd,
      currency: 'USD',
      status: feeUsd === 0 ? 'waived' : 'pending',
    });

    return Response.json({ success: true, amount_usd: feeUsd });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});