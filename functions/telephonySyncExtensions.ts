/**
 * telephonySyncExtensions
 * Syncs all extensions for an org to the PBX:
 * - Missing pbx_extension_id → createExtension
 * - Has pbx_extension_id → updateExtension
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

    const { org_id } = await req.json();
    if (!org_id) return Response.json({ error: 'org_id required' }, { status: 400 });

    await guardTelephony(base44, org_id);

    const [extensions, settingsRecords] = await Promise.all([
      base44.asServiceRole.entities.TelephonyExtension.filter({ org_id }),
      base44.asServiceRole.entities.OrgTelephonySettings.filter({ organization_id: org_id })
    ]);

    const settings = settingsRecords[0];
    const org = { id: org_id, pbx_base_url: settings?.pbx_base_url, pbx_tenant_id: settings?.pbx_tenant_id };

    const results = [];

    for (const ext of extensions) {
      if (!ext.is_active) {
        results.push({ id: ext.id, extension_number: ext.extension_number, action: 'skipped', reason: 'inactive' });
        continue;
      }
      if (!ext.pbx_extension_id) {
        // CREATE
        const provRes = await base44.functions.invoke('pbxProvider3cx', {
          method: 'createExtension', org,
          payload: { extension_number: ext.extension_number, display_name: ext.display_name, email: ext.email, mobile: ext.mobile }
        });
        const { pbx_extension_id } = provRes.data.result;
        await base44.asServiceRole.entities.TelephonyExtension.update(ext.id, { pbx_extension_id });
        results.push({ id: ext.id, extension_number: ext.extension_number, action: 'created', pbx_extension_id });
      } else {
        // UPDATE
        await base44.functions.invoke('pbxProvider3cx', {
          method: 'updateExtension', org,
          payload: { pbx_extension_id: ext.pbx_extension_id, display_name: ext.display_name, email: ext.email }
        });
        results.push({ id: ext.id, extension_number: ext.extension_number, action: 'updated', pbx_extension_id: ext.pbx_extension_id });
      }
    }

    return Response.json({ synced: results.length, results });

  } catch (error) {
    if (error.message === 'TELEPHONY_DISABLED') return Response.json({ error: 'Telephony module disabled' }, { status: 403 });
    return Response.json({ error: error.message }, { status: 500 });
  }
});