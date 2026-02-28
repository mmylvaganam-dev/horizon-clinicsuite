/**
 * telephonyCheckModuleEnabled
 * 
 * REUSABLE GUARD — call this at the start of every telephony endpoint.
 * 
 * Usage from another backend function:
 *   const guardResult = await base44.functions.invoke('telephonyCheckModuleEnabled', { org_id: orgId });
 *   if (!guardResult.data.enabled) {
 *     return Response.json({ error: guardResult.data.reason }, { status: 403 });
 *   }
 * 
 * Or use the inline helper pattern (copy the checkTelephonyEnabled function below into your function).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Inline-able helper — copy this into any telephony function for a single-file guard.
 * async function checkTelephonyEnabled(base44, org_id) {
 *   const access = await base44.entities.OrganizationModuleAccess.filter({
 *     organization_id: org_id,
 *     module_code: 'TELEPHONY',
 *     is_enabled: true
 *   });
 *   if (access.length === 0) throw new Error('TELEPHONY_DISABLED');
 *   return true;
 * }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ enabled: false, reason: 'org_id is required' }, { status: 400 });
    }

    // 1. Check OrganizationModuleAccess for TELEPHONY
    const orgAccess = await base44.entities.OrganizationModuleAccess.filter({
      organization_id: org_id,
      module_code: 'TELEPHONY',
      is_enabled: true
    });

    if (orgAccess.length === 0) {
      return Response.json({
        enabled: false,
        reason: 'Telephony module is not enabled for this organization',
        code: 'TELEPHONY_DISABLED'
      }, { status: 403 });
    }

    // 2. Check settings exist and are active
    const settings = await base44.entities.OrgTelephonySettings.filter({
      organization_id: org_id
    });

    const activeSettings = settings[0];

    if (!activeSettings) {
      return Response.json({
        enabled: false,
        reason: 'Telephony module enabled but not yet configured',
        code: 'TELEPHONY_NOT_CONFIGURED'
      }, { status: 403 });
    }

    if (activeSettings.status === 'suspended') {
      return Response.json({
        enabled: false,
        reason: 'Telephony module is suspended for this organization',
        code: 'TELEPHONY_SUSPENDED'
      }, { status: 403 });
    }

    return Response.json({
      enabled: true,
      settings: {
        pbx_vendor: activeSettings.pbx_vendor,
        sip_provider_name: activeSettings.sip_provider_name,
        did_numbers: activeSettings.did_numbers || [],
        default_inbound_route_type: activeSettings.default_inbound_route_type,
        timezone: activeSettings.timezone,
        status: activeSettings.status
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});