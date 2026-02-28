/**
 * faxReceiveWebhook
 * Inbound fax webhook endpoint.
 * Called by your fax provider (Telnyx, SRFax, eFax, etc.) when a fax arrives.
 *
 * Expected payload:
 *   org_id       - target organization
 *   fax_did      - the DID that received the fax
 *   from_number  - sender's number
 *   received_at  - ISO datetime
 *   pages        - page count
 *   pdf_url      - publicly accessible URL to the PDF (provider must supply this)
 *   webhook_secret - shared secret to validate authenticity
 *
 * SECURITY: Validates PBX_WEBHOOK_SHARED_SECRET env var against payload.webhook_secret
 * For per-org secrets, store in org_telephony_settings.notes or a dedicated field.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SHARED_SECRET = Deno.env.get('PBX_WEBHOOK_SHARED_SECRET') || '';

async function guardTelephony(base44, org_id) {
  const access = await base44.asServiceRole.entities.OrganizationModuleAccess.filter({
    organization_id: org_id, module_code: 'TELEPHONY', is_enabled: true
  });
  if (access.length === 0) throw new Error('TELEPHONY_DISABLED');
}

Deno.serve(async (req) => {
  try {
    // Use service role — no user auth for webhook
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { org_id, fax_did, from_number, received_at, pages, pdf_url, webhook_secret } = body;

    // ── Validate shared secret ───────────────────────────────────────
    if (SHARED_SECRET && webhook_secret !== SHARED_SECRET) {
      console.warn('[faxReceiveWebhook] Invalid webhook secret');
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!org_id || !fax_did || !pdf_url) {
      return Response.json({ error: 'org_id, fax_did, and pdf_url are required' }, { status: 400 });
    }

    // ── Guard: telephony module must be enabled ──────────────────────
    await guardTelephony(base44, org_id);

    // ── Optionally: copy/store the PDF into app file storage ─────────
    // TODO: If the pdf_url is ephemeral (expires), fetch and re-upload:
    // const pdfRes = await fetch(pdf_url);
    // const pdfBuffer = await pdfRes.arrayBuffer();
    // const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: new Blob([pdfBuffer], { type: 'application/pdf' }) });
    // const stored_pdf_url = uploadRes.file_url;
    // For now, store the provider URL directly:
    const pdf_file_pointer = pdf_url;

    // ── Create FaxInboxItem ──────────────────────────────────────────
    const faxItem = await base44.asServiceRole.entities.FaxInboxItem.create({
      org_id,
      fax_did,
      from_number: from_number || 'Unknown',
      received_at: received_at || new Date().toISOString(),
      pages: pages || null,
      pdf_file_pointer,
      status: 'new',
      tags: []
    });

    console.log(`[faxReceiveWebhook] Stored fax ${faxItem.id} for org ${org_id} on DID ${fax_did}`);

    return Response.json({ success: true, fax_id: faxItem.id });

  } catch (error) {
    if (error.message === 'TELEPHONY_DISABLED') {
      return Response.json({ error: 'Telephony module disabled for this organization' }, { status: 403 });
    }
    console.error('[faxReceiveWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});