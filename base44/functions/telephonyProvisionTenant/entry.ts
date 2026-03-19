/**
 * telephonyProvisionTenant
 * Provisions a PBX tenant for an org.
 * - Guards telephony module enabled
 * - Calls PBXProvider3CX.createTenant (stubbed)
 * - Creates baseline queue + IVR if none exist
 * - Sets status = "active"
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
    if (user.role !== 'admin' &&
        user.email !== 'mmylvaganam@premierhealthcanada.ca' &&
        user.email !== 'mylvaganam@premierhealthcanada.ca') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { org_id } = await req.json();
    if (!org_id) return Response.json({ error: 'org_id required' }, { status: 400 });

    await guardTelephony(base44, org_id);

    // Fetch org + settings
    const [orgs, settingsRecords] = await Promise.all([
      base44.asServiceRole.entities.Organization.filter({ id: org_id }),
      base44.asServiceRole.entities.OrgTelephonySettings.filter({ organization_id: org_id })
    ]);

    const org = orgs[0];
    const settings = settingsRecords[0];

    if (!settings) {
      return Response.json({ error: 'Telephony settings not found. Enable the module first.' }, { status: 400 });
    }

    const summary = { org_id, steps: [] };

    // ── Step 1: Provision tenant if not already provisioned ──────────
    if (settings.pbx_tenant_id) {
      summary.steps.push({ step: 'createTenant', status: 'skipped', reason: 'Already provisioned', pbx_tenant_id: settings.pbx_tenant_id });
    } else {
      const provResult = await base44.functions.invoke('pbxProvider3cx', {
        method: 'createTenant',
        org: { id: org_id, code: org?.code, company_name: org?.name }
      });
      const { pbx_tenant_id, pbx_base_url } = provResult.data.result;
      await base44.asServiceRole.entities.OrgTelephonySettings.update(settings.id, {
        pbx_tenant_id, pbx_base_url, status: 'active'
      });
      summary.steps.push({ step: 'createTenant', status: 'done', pbx_tenant_id, pbx_base_url });
      settings.pbx_tenant_id = pbx_tenant_id;
      settings.pbx_base_url = pbx_base_url;
    }

    // ── Step 2: Create baseline queue "Front Desk" if none exist ────
    const queues = await base44.asServiceRole.entities.TelephonyQueue.filter({ org_id });
    if (queues.length === 0) {
      const qResult = await base44.functions.invoke('pbxProvider3cx', {
        method: 'createQueue',
        org: { id: org_id, pbx_base_url: settings.pbx_base_url },
        payload: { name: 'Front Desk', strategy: 'ring_all' }
      });
      await base44.asServiceRole.entities.TelephonyQueue.create({
        org_id, name: 'Front Desk', strategy: 'ring_all', members: [],
        pbx_queue_id: qResult.data.result.pbx_queue_id, is_active: true
      });
      summary.steps.push({ step: 'createBaselineQueue', status: 'done', name: 'Front Desk' });
    } else {
      summary.steps.push({ step: 'createBaselineQueue', status: 'skipped', reason: 'Queues already exist' });
    }

    // ── Step 3: Create baseline IVR "Main Menu" if none exist ───────
    const ivrs = await base44.asServiceRole.entities.TelephonyIVR.filter({ org_id });
    if (ivrs.length === 0) {
      const ivrResult = await base44.functions.invoke('pbxProvider3cx', {
        method: 'createIVR',
        org: { id: org_id, pbx_base_url: settings.pbx_base_url },
        payload: { name: 'Main Menu', menu_json: {} }
      });
      await base44.asServiceRole.entities.TelephonyIVR.create({
        org_id, name: 'Main Menu', menu_json: {},
        pbx_ivr_id: ivrResult.data.result.pbx_ivr_id, is_active: true
      });
      summary.steps.push({ step: 'createBaselineIVR', status: 'done', name: 'Main Menu' });
    } else {
      summary.steps.push({ step: 'createBaselineIVR', status: 'skipped', reason: 'IVRs already exist' });
    }

    // ── Step 4: Set status active ────────────────────────────────────
    await base44.asServiceRole.entities.OrgTelephonySettings.update(settings.id, { status: 'active' });
    summary.status = 'active';
    summary.message = 'Provisioning complete';

    return Response.json(summary);

  } catch (error) {
    if (error.message === 'TELEPHONY_DISABLED') {
      return Response.json({ error: 'Telephony module disabled' }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});