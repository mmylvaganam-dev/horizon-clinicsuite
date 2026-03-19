/**
 * PBX Provider Abstraction — 3CX Implementation
 * ================================================
 * This function acts as the shared PBX provider library.
 * It is called internally by other telephony functions via:
 *   base44.functions.invoke('pbxProvider3cx', { method, org, payload })
 *
 * Interface methods (all return a result object):
 *   createTenant(org)
 *   createExtension(org, extension)
 *   updateExtension(org, extension)
 *   createQueue(org, queue)
 *   updateQueue(org, queue)
 *   createIVR(org, ivr)
 *   updateIVR(org, ivr)
 *   fetchCallLogs(org, filters)
 *
 * REAL 3CX API INTEGRATION NOTES:
 *   Base URL: org.pbx_base_url (e.g. https://yourtenant.3cx.com.au)
 *   Auth: OAuth2 client_credentials using PBX_ADMIN_CLIENT_ID + PBX_ADMIN_CLIENT_SECRET
 *   Docs: https://www.3cx.com/docs/3cx-v20-rest-api/
 *   The env vars below must be set in platform secrets for real calls to work:
 *     PBX_ADMIN_BASE_URL, PBX_ADMIN_CLIENT_ID, PBX_ADMIN_CLIENT_SECRET
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── 3CX OAuth helper (stub — real call commented inline) ─────────────────────
async function get3cxAccessToken(baseUrl, clientId, clientSecret) {
  // TODO: Real implementation:
  // const res = await fetch(`${baseUrl}/api/v1/connect/token`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({
  //     grant_type: 'client_credentials',
  //     client_id: clientId,
  //     client_secret: clientSecret,
  //   })
  // });
  // const json = await res.json();
  // return json.access_token;
  return 'STUB_ACCESS_TOKEN';
}

// ─── Provider Methods ──────────────────────────────────────────────────────────

async function createTenant(org) {
  // TODO: Real 3CX:
  // POST ${PBX_ADMIN_BASE_URL}/api/v1/tenants
  // Body: { name: org.company_name, subdomain: org.code, ... }
  // Returns: { tenantId, baseUrl, apiKey }
  console.log(`[3CX STUB] createTenant for org: ${org.id}`);
  const stubTenantId = `3cx-tenant-${org.id.slice(0, 8)}`;
  const stubBaseUrl = `https://${org.code || org.id.slice(0, 8)}.stub.3cx.example.com`;
  return {
    pbx_tenant_id: stubTenantId,
    pbx_base_url: stubBaseUrl,
    provisioned_at: new Date().toISOString(),
    stub: true
  };
}

async function createExtension(org, extension) {
  // TODO: Real 3CX:
  // POST ${org.pbx_base_url}/api/v1/Extensions
  // Body: { Number: extension.extension_number, FirstName: extension.display_name, Email: extension.email }
  // Auth: Bearer ${accessToken}
  console.log(`[3CX STUB] createExtension: ${extension.extension_number} for org: ${org.id}`);
  return {
    pbx_extension_id: `3cx-ext-${extension.extension_number}-${Date.now()}`,
    stub: true
  };
}

async function updateExtension(org, extension) {
  // TODO: Real 3CX:
  // PUT ${org.pbx_base_url}/api/v1/Extensions/${extension.pbx_extension_id}
  console.log(`[3CX STUB] updateExtension: ${extension.pbx_extension_id}`);
  return { updated: true, stub: true };
}

async function createQueue(org, queue) {
  // TODO: Real 3CX:
  // POST ${org.pbx_base_url}/api/v1/CallQueues
  // Body: { Name: queue.name, RingStrategy: mapStrategy(queue.strategy), Members: [...] }
  console.log(`[3CX STUB] createQueue: ${queue.name} for org: ${org.id}`);
  return {
    pbx_queue_id: `3cx-queue-${queue.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
    stub: true
  };
}

async function updateQueue(org, queue) {
  // TODO: Real 3CX:
  // PUT ${org.pbx_base_url}/api/v1/CallQueues/${queue.pbx_queue_id}
  console.log(`[3CX STUB] updateQueue: ${queue.pbx_queue_id}`);
  return { updated: true, stub: true };
}

async function createIVR(org, ivr) {
  // TODO: Real 3CX:
  // POST ${org.pbx_base_url}/api/v1/IvrMenus
  // Body: { Name: ivr.name, Options: mapMenuJson(ivr.menu_json), Greeting: ivr.greeting_file_pointer }
  console.log(`[3CX STUB] createIVR: ${ivr.name} for org: ${org.id}`);
  return {
    pbx_ivr_id: `3cx-ivr-${ivr.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
    stub: true
  };
}

async function updateIVR(org, ivr) {
  // TODO: Real 3CX:
  // PUT ${org.pbx_base_url}/api/v1/IvrMenus/${ivr.pbx_ivr_id}
  console.log(`[3CX STUB] updateIVR: ${ivr.pbx_ivr_id}`);
  return { updated: true, stub: true };
}

async function fetchCallLogs(org, filters = {}) {
  // TODO: Real 3CX:
  // GET ${org.pbx_base_url}/api/v1/CallLog
  // Params: { from: filters.from, to: filters.to, limit: 200 }
  // Auth: Bearer ${accessToken}
  // Map response to { direction, from_number, to_number, extension, started_at, ended_at, duration_seconds, disposition, pbx_call_id }
  console.log(`[3CX STUB] fetchCallLogs for org: ${org.id}`);
  return {
    call_logs: [],
    fetched_at: new Date().toISOString(),
    stub: true
  };
}

// ─── Router ────────────────────────────────────────────────────────────────────

const METHODS = { createTenant, createExtension, updateExtension, createQueue, updateQueue, createIVR, updateIVR, fetchCallLogs };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { method, org, payload } = body;

    if (!method || !METHODS[method]) {
      return Response.json({ error: `Unknown method: ${method}` }, { status: 400 });
    }

    const result = await METHODS[method](org, payload);
    return Response.json({ result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});