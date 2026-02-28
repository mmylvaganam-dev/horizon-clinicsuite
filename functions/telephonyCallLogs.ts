/**
 * telephonyCallLogs
 * Actions: list, create (for webhook ingestion)
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
    const { action, org_id, filters, payload } = body;
    if (!org_id) return Response.json({ error: 'org_id required' }, { status: 400 });

    await guardTelephony(base44, org_id);

    if (action === 'list') {
      const query = { org_id };
      if (filters?.direction) query.direction = filters.direction;
      if (filters?.disposition) query.disposition = filters.disposition;
      const items = await base44.entities.CallLog.filter(query, '-started_at', filters?.limit || 100);
      return Response.json({ items });
    }

    if (action === 'create') {
      // Used by webhook ingestion from PBX
      const item = await base44.entities.CallLog.create({ ...payload, org_id });
      return Response.json({ item });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    if (error.message === 'TELEPHONY_DISABLED') {
      return Response.json({ error: 'Telephony module disabled for this organization' }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});