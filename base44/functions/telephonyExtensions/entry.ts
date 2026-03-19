/**
 * telephonyExtensions
 * Actions: list, create, update, delete
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function guardTelephony(base44, org_id) {
  const access = await base44.entities.OrganizationModuleAccess.filter({
    organization_id: org_id, module_code: 'TELEPHONY', is_enabled: true
  });
  if (access.length === 0) throw new Error('TELEPHONY_DISABLED');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, org_id, id, payload } = body;
    if (!org_id) return Response.json({ error: 'org_id required' }, { status: 400 });

    await guardTelephony(base44, org_id);

    if (action === 'list') {
      const items = await base44.entities.TelephonyExtension.filter({ org_id });
      return Response.json({ items });
    }

    if (action === 'create') {
      const item = await base44.entities.TelephonyExtension.create({ ...payload, org_id });
      return Response.json({ item });
    }

    if (action === 'update') {
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const item = await base44.entities.TelephonyExtension.update(id, payload);
      return Response.json({ item });
    }

    if (action === 'delete') {
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      await base44.entities.TelephonyExtension.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    if (error.message === 'TELEPHONY_DISABLED') {
      return Response.json({ error: 'Telephony module disabled for this organization' }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});