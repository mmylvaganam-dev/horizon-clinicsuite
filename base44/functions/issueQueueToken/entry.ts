import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { counter_id, patient_id, patient_name, patient_mobile, appointment_id, priority, notes } = await req.json();

    if (!counter_id) return Response.json({ error: 'counter_id is required' }, { status: 400 });

    // Get the counter
    const counters = await base44.entities.QueueCounter.filter({ id: counter_id });
    if (!counters.length) return Response.json({ error: 'Counter not found' }, { status: 404 });
    const counter = counters[0];

    const today = new Date().toISOString().split('T')[0];

    // Get today's tokens for this counter to find max seq
    const todayTokens = await base44.entities.QueueToken.filter({ counter_id, session_date: today });
    const maxSeq = todayTokens.reduce((max, t) => Math.max(max, t.token_seq || 0), 0);
    const nextSeq = maxSeq + 1;
    const tokenNumber = `${counter.prefix}${String(nextSeq).padStart(3, '0')}`;

    // Create the token
    const token = await base44.entities.QueueToken.create({
      organization_id: counter.organization_id,
      location_id: counter.location_id || '',
      counter_id,
      session_date: today,
      token_number: tokenNumber,
      token_seq: nextSeq,
      patient_id: patient_id || '',
      patient_name: patient_name || 'Walk-in',
      patient_mobile: patient_mobile || '',
      appointment_id: appointment_id || '',
      status: 'waiting',
      priority: priority || 'normal',
      notes: notes || '',
      sms_sent: false,
    });

    return Response.json({ success: true, token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});