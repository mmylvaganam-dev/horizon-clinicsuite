import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
      module,
      action_type,
      entity_type,
      entity_id,
      patient_id,
      description,
      old_values,
      new_values,
      status = 'success',
      error_message
    } = body;

    // Log the activity
    const auditLog = await base44.asServiceRole.entities.AuditLog.create({
      organization_id,
      module,
      action_type,
      entity_type,
      entity_id,
      patient_id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      description,
      old_values,
      new_values,
      status,
      error_message,
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true, auditLog });
  } catch (error) {
    console.error('Error logging activity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});