/**
 * telephonySyncQueuesAndIVRs
 * Syncs queues AND IVRs for an org to the PBX.
 * Action: "queues" | "ivrs" | "all"
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function guardTelephony(base44, org_id) {
  const access = await base44.entities.OrganizationModuleAccess.filter({
    organization_id: org_id, module_code: 'TELEPHONY', is_enabled: true
  });
  if (access.length === 0) throw new Error('TELEPHONY_DISABLED');
}

async function syncQueues(base44, org_id, org) {
  const queues = await base44.asServiceRole.entities.TelephonyQueue.filter({ org_id });
  const results = [];
  for (const q of queues) {
    if (!q.is_active) { results.push({ id: q.id, name: q.name, action: 'skipped' }); continue; }
    if (!q.pbx_queue_id) {
      const res = await base44.functions.invoke('pbxProvider3cx', { method: 'createQueue', org, payload: q });
      await base44.asServiceRole.entities.TelephonyQueue.update(q.id, { pbx_queue_id: res.data.result.pbx_queue_id });
      results.push({ id: q.id, name: q.name, action: 'created', pbx_queue_id: res.data.result.pbx_queue_id });
    } else {
      await base44.functions.invoke('pbxProvider3cx', { method: 'updateQueue', org, payload: q });
      results.push({ id: q.id, name: q.name, action: 'updated' });
    }
  }
  return results;
}

async function syncIVRs(base44, org_id, org) {
  const ivrs = await base44.asServiceRole.entities.TelephonyIVR.filter({ org_id });
  const results = [];
  for (const ivr of ivrs) {
    if (!ivr.is_active) { results.push({ id: ivr.id, name: ivr.name, action: 'skipped' }); continue; }
    if (!ivr.pbx_ivr_id) {
      const res = await base44.functions.invoke('pbxProvider3cx', { method: 'createIVR', org, payload: ivr });
      await base44.asServiceRole.entities.TelephonyIVR.update(ivr.id, { pbx_ivr_id: res.data.result.pbx_ivr_id });
      results.push({ id: ivr.id, name: ivr.name, action: 'created', pbx_ivr_id: res.data.result.pbx_ivr_id });
    } else {
      await base44.functions.invoke('pbxProvider3cx', { method: 'updateIVR', org, payload: ivr });
      results.push({ id: ivr.id, name: ivr.name, action: 'updated' });
    }
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { org_id, action = 'all' } = await req.json();
    if (!org_id) return Response.json({ error: 'org_id required' }, { status: 400 });

    await guardTelephony(base44, org_id);

    const settingsRecords = await base44.asServiceRole.entities.OrgTelephonySettings.filter({ organization_id: org_id });
    const settings = settingsRecords[0];
    const org = { id: org_id, pbx_base_url: settings?.pbx_base_url, pbx_tenant_id: settings?.pbx_tenant_id };

    const summary = {};
    if (action === 'queues' || action === 'all') {
      summary.queues = await syncQueues(base44, org_id, org);
    }
    if (action === 'ivrs' || action === 'all') {
      summary.ivrs = await syncIVRs(base44, org_id, org);
    }

    return Response.json(summary);

  } catch (error) {
    if (error.message === 'TELEPHONY_DISABLED') return Response.json({ error: 'Telephony module disabled' }, { status: 403 });
    return Response.json({ error: error.message }, { status: 500 });
  }
});