/**
 * telephonyAdminSettings
 * 
 * GET/SET org telephony settings + module enable/disable toggle.
 * Platform owner and org admins only.
 * 
 * Actions:
 *   get_settings      - fetch current OrgTelephonySettings for org
 *   save_settings     - upsert OrgTelephonySettings
 *   enable_module     - enable TELEPHONY in OrganizationModuleAccess + create default settings
 *   disable_module    - disable TELEPHONY in OrganizationModuleAccess
 *   suspend_module    - set status=suspended in OrgTelephonySettings
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PLATFORM_OWNERS = [
  'mmylvaganam@premierhealthcanada.ca',
  'mylvaganam@premierhealthcanada.ca'
];

async function writeAuditLog(base44, { org_id, user, action, entity_id, old_values, new_values, description }) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      organization_id: org_id,
      module: 'admin',
      action_type: action,
      entity_type: 'OrgTelephonySettings',
      entity_id: entity_id || org_id,
      user_id: user.id || user.email,
      user_email: user.email,
      user_name: user.full_name || user.email,
      description,
      old_values,
      new_values,
      timestamp: new Date().toISOString(),
      status: 'success'
    });
  } catch (e) {
    console.error('Audit log write failed:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPlatformOwner = PLATFORM_OWNERS.includes(user.email);
    // Allow platform owners and admin-role users
    if (!isPlatformOwner && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, org_id, settings } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id is required' }, { status: 400 });
    }

    // ─── GET SETTINGS ─────────────────────────────────────────────
    if (action === 'get_settings') {
      const [accessRecords, settingsRecords] = await Promise.all([
        base44.asServiceRole.entities.OrganizationModuleAccess.filter({
          organization_id: org_id,
          module_code: 'TELEPHONY'
        }),
        base44.asServiceRole.entities.OrgTelephonySettings.filter({
          organization_id: org_id
        })
      ]);

      return Response.json({
        module_enabled: accessRecords[0]?.is_enabled === true,
        module_access: accessRecords[0] || null,
        settings: settingsRecords[0] || null
      });
    }

    // ─── ENABLE MODULE ────────────────────────────────────────────
    if (action === 'enable_module') {
      const existing = await base44.asServiceRole.entities.OrganizationModuleAccess.filter({
        organization_id: org_id,
        module_code: 'TELEPHONY'
      });

      let accessRecord;
      if (existing.length > 0) {
        accessRecord = await base44.asServiceRole.entities.OrganizationModuleAccess.update(
          existing[0].id,
          { is_enabled: true, enabled_at: new Date().toISOString(), enabled_by: user.email }
        );
      } else {
        accessRecord = await base44.asServiceRole.entities.OrganizationModuleAccess.create({
          organization_id: org_id,
          module_code: 'TELEPHONY',
          is_enabled: true,
          enabled_at: new Date().toISOString(),
          enabled_by: user.email,
          license_type: 'full'
        });
      }

      // Create default settings record if not exists
      const existingSettings = await base44.asServiceRole.entities.OrgTelephonySettings.filter({
        organization_id: org_id
      });

      if (existingSettings.length === 0) {
        await base44.asServiceRole.entities.OrgTelephonySettings.create({
          organization_id: org_id,
          pbx_vendor: 'telnyx',
          timezone: 'Asia/Colombo',
          default_inbound_route_type: 'queue',
          did_numbers: [],
          status: 'pending'
        });
      }

      await writeAuditLog(base44, {
        org_id, user, action: 'update', entity_id: org_id,
        old_values: { telephony_enabled: false },
        new_values: { telephony_enabled: true },
        description: `Telephony module ENABLED for org ${org_id}`
      });

      return Response.json({ success: true, message: 'Telephony module enabled' });
    }

    // ─── DISABLE MODULE ───────────────────────────────────────────
    if (action === 'disable_module') {
      const existing = await base44.asServiceRole.entities.OrganizationModuleAccess.filter({
        organization_id: org_id,
        module_code: 'TELEPHONY'
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.OrganizationModuleAccess.update(
          existing[0].id,
          { is_enabled: false }
        );
      }

      await writeAuditLog(base44, {
        org_id, user, action: 'update', entity_id: org_id,
        old_values: { telephony_enabled: true },
        new_values: { telephony_enabled: false },
        description: `Telephony module DISABLED for org ${org_id}`
      });

      return Response.json({ success: true, message: 'Telephony module disabled' });
    }

    // ─── SAVE SETTINGS ────────────────────────────────────────────
    if (action === 'save_settings') {
      if (!settings) {
        return Response.json({ error: 'settings payload required' }, { status: 400 });
      }

      // Never store raw secrets — only store references
      const safeSettings = { ...settings };
      delete safeSettings.pbx_api_secret; // raw secret never persisted here

      const existing = await base44.asServiceRole.entities.OrgTelephonySettings.filter({
        organization_id: org_id
      });

      let result;
      if (existing.length > 0) {
        const old = existing[0];
        result = await base44.asServiceRole.entities.OrgTelephonySettings.update(
          old.id,
          { ...safeSettings, organization_id: org_id }
        );
        await writeAuditLog(base44, {
          org_id, user, action: 'update', entity_id: old.id,
          old_values: { pbx_vendor: old.pbx_vendor, sip_provider_name: old.sip_provider_name, did_numbers: old.did_numbers, status: old.status },
          new_values: { pbx_vendor: safeSettings.pbx_vendor, sip_provider_name: safeSettings.sip_provider_name, did_numbers: safeSettings.did_numbers, status: safeSettings.status },
          description: `Telephony settings updated for org ${org_id}`
        });
      } else {
        result = await base44.asServiceRole.entities.OrgTelephonySettings.create({
          ...safeSettings,
          organization_id: org_id
        });
        await writeAuditLog(base44, {
          org_id, user, action: 'create', entity_id: result.id,
          old_values: null,
          new_values: safeSettings,
          description: `Telephony settings created for org ${org_id}`
        });
      }

      return Response.json({ success: true, settings: result });
    }

    // ─── SUSPEND MODULE ───────────────────────────────────────────
    if (action === 'suspend_module') {
      const existing = await base44.asServiceRole.entities.OrgTelephonySettings.filter({
        organization_id: org_id
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.OrgTelephonySettings.update(
          existing[0].id,
          { status: 'suspended' }
        );
        await writeAuditLog(base44, {
          org_id, user, action: 'update', entity_id: existing[0].id,
          old_values: { status: existing[0].status },
          new_values: { status: 'suspended' },
          description: `Telephony module SUSPENDED for org ${org_id}`
        });
      }

      return Response.json({ success: true, message: 'Telephony module suspended' });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});