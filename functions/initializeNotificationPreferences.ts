import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { organization_id } = body;

    // Check if preferences already exist
    const existing = await base44.entities.UserNotificationPreference.filter({
      user_id: user.id,
      organization_id,
    });

    if (existing.length > 0) {
      return Response.json(existing[0]);
    }

    // Create default preferences
    const defaultPrefs = {
      user_id: user.id,
      user_email: user.email,
      organization_id,
      task_assigned: { in_app: true, email: true },
      appointment_upcoming: { in_app: true, email: false },
      appointment_missed: { in_app: true, email: true },
      patient_update: { in_app: true, email: false },
      lab_result: { in_app: true, email: true },
      prescription: { in_app: true, email: false },
      critical_alert: { in_app: true, email: true },
      quiet_hours_enabled: false,
    };

    const prefs = await base44.entities.UserNotificationPreference.create(defaultPrefs);

    return Response.json(prefs);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});