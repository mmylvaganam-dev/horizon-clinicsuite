/**
 * telephonyIngestCallLogs
 * Manual trigger to pull call logs from PBX and upsert to CallLog entity.
 * Uses PBXProvider3CX.fetchCallLogs (stubbed — returns empty list until real 3CX connected).
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

    const { org_id, filters = {} } = await req.json();
    if (!org_id) return Response.json({ error: 'org_id required' }, { status: 400 });

    await guardTelephony(base44, org_id);

    const settingsRecords = await base44.asServiceRole.entities.OrgTelephonySettings.filter({ organization_id: org_id });
    const settings = settingsRecords[0];
    const org = { id: org_id, pbx_base_url: settings?.pbx_base_url, pbx_tenant_id: settings?.pbx_tenant_id };

    // Fetch from provider (stubbed)
    const provRes = await base44.functions.invoke('pbxProvider3cx', {
      method: 'fetchCallLogs', org, payload: filters
    });

    const callLogs = provRes.data.result.call_logs || [];
    let inserted = 0;
    let skipped = 0;

    for (const log of callLogs) {
      // Upsert by pbx_call_id to avoid duplicates
      if (log.pbx_call_id) {
        const existing = await base44.asServiceRole.entities.CallLog.filter({
          org_id, pbx_call_id: log.pbx_call_id
        });
        if (existing.length > 0) { skipped++; continue; }
      }
      await base44.asServiceRole.entities.CallLog.create({ ...log, org_id });
      inserted++;
    }

    return Response.json({
      fetched: callLogs.length,
      inserted,
      skipped,
      stub: provRes.data.result.stub || false,
      message: provRes.data.result.stub
        ? 'Stub provider returned 0 logs. Real logs will appear once 3CX is connected.'
        : `Ingested ${inserted} new call log entries.`
    });

  } catch (error) {
    if (error.message === 'TELEPHONY_DISABLED') return Response.json({ error: 'Telephony module disabled' }, { status: 403 });
    return Response.json({ error: error.message }, { status: 500 });
  }
});