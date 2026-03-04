import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      organization_id,
      user_id,
      user_email,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
    } = body;

    // Create in-app notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      organization_id,
      user_id,
      user_email,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      is_read: false,
      is_sent_email: false,
    });

    // Check user preferences and send email if needed
    const prefs = await base44.asServiceRole.entities.UserNotificationPreference.filter({
      user_id,
    });

    const preference = prefs[0];
    if (preference && preference[type]?.email) {
      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: user_email,
        subject: title,
        body: `${message}\n\nView in app: ${action_url || 'Check your notifications'}`,
      });

      // Mark email as sent
      await base44.asServiceRole.entities.Notification.update(notification.id, {
        is_sent_email: true,
      });
    }

    return Response.json(notification);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});