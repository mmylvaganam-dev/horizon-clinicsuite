import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointment_id } = await req.json();
    if (!appointment_id) {
      return Response.json({ error: 'appointment_id is required' }, { status: 400 });
    }

    // Check if a room already exists for this appointment
    const existing = await base44.asServiceRole.entities.VirtualRoom.filter({ appointment_id });
    if (existing.length > 0) {
      return Response.json({ room: existing[0] });
    }

    // Create Whereby room (expires in 24h)
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
      }),
    });

    if (!wherebyRes.ok) {
      const err = await wherebyRes.text();
      return Response.json({ error: `Whereby API error: ${err}` }, { status: 500 });
    }

    const wherebyData = await wherebyRes.json();

    // Save to VirtualRoom entity
    const room = await base44.asServiceRole.entities.VirtualRoom.create({
      appointment_id,
      whereby_room_id: wherebyData.meetingId,
      join_url: wherebyData.roomUrl,
      expiry_time: expiryTime,
    });

    return Response.json({ room });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});