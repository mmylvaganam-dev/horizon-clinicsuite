import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role for scheduled/automated calls
    const providers = await base44.asServiceRole.entities.WholesaleProvider.filter({ status: 'active' });
    const allProducts = await base44.asServiceRole.entities.WholesaleProduct.list();

    let totalAlerts = 0;
    const results = [];

    for (const provider of providers) {
      const providerProducts = allProducts.filter(p =>
        p.provider_id === provider.id &&
        p.status === 'active' &&
        p.reorder_level != null &&
        p.stock_qty <= p.reorder_level
      );

      if (providerProducts.length === 0) continue;

      totalAlerts += providerProducts.length;
      const recipientEmails = provider.admin_emails?.filter(Boolean) || [];
      if (recipientEmails.length === 0) {
        results.push({ provider: provider.company_name, skipped: 'no admin emails' });
        continue;
      }

      const itemRows = providerProducts.map(p => `
        <tr>
          <td style="padding:8px 12px;font-size:13px"><strong>${p.name}</strong><br/><span style="color:#94a3b8;font-size:11px">SKU: ${p.sku || 'N/A'}</span></td>
          <td style="padding:8px 12px;text-align:center;font-weight:bold;color:${p.stock_qty === 0 ? '#dc2626' : '#d97706'}">${p.stock_qty} ${p.unit}</td>
          <td style="padding:8px 12px;text-align:center;color:#64748b">${p.reorder_level} ${p.unit}</td>
          <td style="padding:8px 12px;text-align:center"><span style="background:${p.stock_qty === 0 ? '#fee2e2' : '#fef3c7'};color:${p.stock_qty === 0 ? '#dc2626' : '#d97706'};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:bold">${p.stock_qty === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}</span></td>
        </tr>`).join('');

      const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e293b;padding:24px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">⚠️ Daily Stock Alert</h1>
    <p style="color:#94a3b8;margin:4px 0 0">${provider.company_name}</p>
  </div>
  <div style="background:#fefce8;border:1px solid #fbbf24;padding:16px 24px">
    <p style="margin:0;color:#92400e;font-weight:bold">${providerProducts.length} product(s) are below reorder level as of ${new Date().toLocaleDateString('en-GB')}</p>
  </div>
  <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#e2e8f0">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569">Product</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;color:#475569">Current Stock</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;color:#475569">Reorder Level</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;color:#475569">Status</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>
  <div style="background:#f1f5f9;padding:16px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0;color:#64748b;font-size:12px">Automated daily alert · Horizon ClinicSuite Wholesale Pharma</p>
  </div>
</div>`;

      for (const email of recipientEmails) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `⚠️ Stock Alert — ${provider.company_name} (${providerProducts.length} items need restocking)`,
          body: emailBody,
        });
      }

      results.push({ provider: provider.company_name, alerts: providerProducts.length, notified: recipientEmails });
    }

    return Response.json({ success: true, totalAlerts, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});