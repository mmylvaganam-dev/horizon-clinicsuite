// Public-accessible function to get/create a Whereby room for a tele appointment.
// Used by both patients (no clinic auth) and providers.
// Validates appointment_id exists and is in a valid state.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { appointment_id, role } = await req.json();

    if (!appointment_id) {
      return Response.json({ error: 'appointment_id is required' }, { status: 400 });
    }

    // Fetch appointment (service role — allows both patient portal and staff)
    const appt = await base44.asServiceRole.entities.TeleAppointment.get(appointment_id);
    if (!appt) {
      return Response.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (!['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status)) {
      return Response.json({ error: 'Appointment is not active' }, { status: 400 });
    }

    // Check if a room already exists
    const existing = await base44.asServiceRole.entities.VirtualRoom.filter({ appointment_id });
    if (existing.length > 0) {
      const room = existing[0];
      // Provider/staff get the host URL; patients get the regular join URL
      return Response.json({
        room,
        url: (role === 'provider' || role === 'staff') && room.host_url ? room.host_url : room.join_url,
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
          destination: {
            provider: 'whereby',
          },
          startTrigger: 'none', // provider manually starts recording
        },
      }),
    });

    if (!wherebyRes.ok) {
      const err = await wherebyRes.text();
      return Response.json({ error: `Whereby API error: ${err}` }, { status: 500 });
    }

    const wherebyData = await wherebyRes.json();

    // Save the room
    const room = await base44.asServiceRole.entities.VirtualRoom.create({
      appointment_id,
      whereby_room_id: wherebyData.meetingId,
      join_url: wherebyData.roomUrl,
      host_url: wherebyData.hostRoomUrl,
      expiry_time: expiryTime,
    });

    // If provider is starting — advance appointment to IN_PROGRESS
    if ((role === 'provider' || role === 'staff') && appt.status !== 'IN_PROGRESS') {
      await base44.asServiceRole.entities.TeleAppointment.update(appointment_id, { status: 'IN_PROGRESS' });
    }

    return Response.json({
      room,
      url: (role === 'provider' || role === 'staff') && room.host_url ? room.host_url : room.join_url,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});