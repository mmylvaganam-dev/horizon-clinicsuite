/**
 * faxInbox
 * Actions: list, assign, archive, update_tags
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
    const { action, org_id, fax_id, user_id, tags, filters, status } = body;
    if (!org_id) return Response.json({ error: 'org_id required' }, { status: 400 });

    await guardTelephony(base44, org_id);

    if (action === 'list') {
      const query = { org_id };
      if (filters?.status) query.status = filters.status;
      const items = await base44.entities.FaxInboxItem.filter(query, '-received_at', 100);
      return Response.json({ items });
    }

    if (action === 'assign') {
      if (!fax_id || !user_id) return Response.json({ error: 'fax_id and user_id required' }, { status: 400 });
      const item = await base44.entities.FaxInboxItem.update(fax_id, {
        assigned_to_user_id: user_id,
        status: 'assigned'
      });
      return Response.json({ item });
    }

    if (action === 'archive') {
      if (!fax_id) return Response.json({ error: 'fax_id required' }, { status: 400 });
      const item = await base44.entities.FaxInboxItem.update(fax_id, { status: 'archived' });
      return Response.json({ item });
    }

    if (action === 'update_tags') {
      if (!fax_id) return Response.json({ error: 'fax_id required' }, { status: 400 });
      const item = await base44.entities.FaxInboxItem.update(fax_id, { tags: tags || [] });
      return Response.json({ item });
    }

    if (action === 'update_status') {
      if (!fax_id || !status) return Response.json({ error: 'fax_id and status required' }, { status: 400 });
      const item = await base44.entities.FaxInboxItem.update(fax_id, { status });
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