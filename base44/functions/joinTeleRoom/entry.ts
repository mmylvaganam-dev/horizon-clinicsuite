// Get/create a Whereby room for a tele appointment.
// Used by both patients (TelePatient OTP session, no clinic auth) and providers.
// Validates appointment_id exists, is active, and that the caller is authorized:
//   - provider/staff: must be an authenticated clinic user (host controls)
//   - patient: must be the appointment's patient (verified by patient_id or
//     patient_email matching the appointment) unless they are an
//     authenticated clinic user.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { appointment_id, role, patient_id, patient_email } = await req.json();

    if (!appointment_id) {
      return Response.json({ error: 'appointment_id is required' }, { status: 400 });
    }

    const isHostRole = role === 'provider' || role === 'staff';

    // SECURITY: resolve an authenticated clinic user if present.
    let authenticatedUser = null;
    try {
      authenticatedUser = await base44.auth.me();
    } catch (_) { /* not authenticated */ }

    if (isHostRole && !authenticatedUser) {
      return Response.json({ error: 'Authentication required for provider/staff role' }, { status: 401 });
    }

    // Fetch appointment (service role — supports both patient portal and staff)
    const appt = await base44.asServiceRole.entities.TeleAppointment.get(appointment_id);
    if (!appt) {
      return Response.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // SECURITY: unauthenticated callers (patient portal) must prove they are
    // the appointment's patient. Authenticated clinic users bypass this.
    if (!authenticatedUser) {
      const emailMatch = !!patient_email && !!appt.patient_email &&
        String(patient_email).toLowerCase() === String(appt.patient_email).toLowerCase();
      const idMatch = !!patient_id && !!appt.patient_id &&
        String(patient_id) === String(appt.patient_id);
      if (!emailMatch && !idMatch) {
        return Response.json({ error: 'Not authorized to join this consultation' }, { status: 403 });
      }
    }

    if (!['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status)) {
      return Response.json({ error: 'Appointment is not active' }, { status: 400 });
    }

    // Check if a room already exists
    const existing = await base44.asServiceRole.entities.VirtualRoom.filter({ appointment_id });
    if (existing.length > 0) {
      const room = existing[0];
      return Response.json({
        room,
        url: isHostRole && room.host_url ? room.host_url : room.join_url,
      });
    }

    // Create a new Whereby room (expires in 24 hours from now)
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const wherebyRes = await fetch('https://api.whereby.dev/v1/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('WHEREBY_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endDate: expiryTime,
        fields: ['hostRoomUrl'],
        recording: {
          type: 'cloud',
          destination: { provider: 'whereby' },
          startTrigger: 'none',
        },
      }),
    });

    if (!wherebyRes.ok) {
      const err = await wherebyRes.text();
      return Response.json({ error: `Whereby API error: ${err}` }, { status: 500 });
    }

    const wherebyData = await wherebyRes.json();

    const room = await base44.asServiceRole.entities.VirtualRoom.create({
      appointment_id,
      whereby_room_id: wherebyData.meetingId,
      join_url: wherebyData.roomUrl,
      host_url: wherebyData.hostRoomUrl,
      expiry_time: expiryTime,
    });

    // If provider is starting — advance appointment to IN_PROGRESS
    if (isHostRole && appt.status !== 'IN_PROGRESS') {
      await base44.asServiceRole.entities.TeleAppointment.update(appointment_id, { status: 'IN_PROGRESS' });
    }

    return Response.json({
      room,
      url: isHostRole && room.host_url ? room.host_url : room.join_url,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});