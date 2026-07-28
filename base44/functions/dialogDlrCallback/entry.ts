import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DLR_SECRET = Deno.env.get('DIALOG_DLR_SECRET') || '';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse query parameters
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const campaignId = url.searchParams.get('campaignId');
    const msisdn = url.searchParams.get('msisdn');
    const status = url.searchParams.get('status');

    // ── Validate shared secret (fail-closed) ─────────────────────────
    if (!DLR_SECRET || token !== DLR_SECRET) {
      console.warn('[dialogDlrCallback] Invalid or missing DLR token');
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.log('DLR received:', { campaignId, msisdn, status });
    
    if (!campaignId || !msisdn || !status) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    // Log delivery update
    await base44.asServiceRole.entities.SmsDeliveryUpdate.create({
      campaign_id: campaignId,
      msisdn,
      status,
      received_at: new Date().toISOString()
    });
    
    // Update SmsOutbox status if needed
    const outboxRecords = await base44.asServiceRole.entities.SmsOutbox.filter({ campaign_id: campaignId });
    
    if (outboxRecords.length > 0) {
      const record = outboxRecords[0];
      
      // Update status based on DLR
      let newStatus = record.provider_status;
      if (status.toLowerCase().includes('delivered')) {
        newStatus = 'sent';
      } else if (status.toLowerCase().includes('failed') || status.toLowerCase().includes('reject')) {
        newStatus = 'failed';
      }
      
      await base44.asServiceRole.entities.SmsOutbox.update(record.id, {
        provider_status: newStatus,
        provider_comment: status
      });
    }
    
    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('DLR callback error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});