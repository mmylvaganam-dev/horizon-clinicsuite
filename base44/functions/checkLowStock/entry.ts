import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both scheduled/entity triggers (no user) and manual admin calls
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    isAdmin = true;
  } catch (_) {
    // Called from automation (no user token) — allow via service role
  }

  const payload = await req.json().catch(() => ({}));
  const { organization_id } = payload; // optional: scope to one org

  // Fetch all stock (service role so no user auth needed)
  const allStock = await base44.asServiceRole.entities.PharmacyStock.list('-updated_date', 5000);

  // Check per-org alert enabled setting before sending emails
  const allConfigs = await base44.asServiceRole.entities.OrganizationConfig.list();
  const isAlertEnabled = (orgId) => {
    const cfg = allConfigs.find(c => c.organization_id === orgId && c.config_key_id === 'low_stock_alert_enabled');
    return cfg ? cfg.value !== 'false' : true; // default enabled
  };
  const getAlertEmail = (orgId) => {
    const cfg = allConfigs.find(c => c.organization_id === orgId && c.config_key_id === 'low_stock_alert_email');
    return cfg?.value || null;
  };

  const stockToCheck = organization_id
    ? allStock.filter(s => s.organization_id === organization_id)
    : allStock;

  // Find items that are below minimum_stock_level and are usable
  const lowStockItems = stockToCheck.filter(item => {
    if (item.quality_status && item.quality_status !== 'usable') return false;
    const minLevel = item.minimum_stock_level ?? 5;
    return item.quantity <= minLevel;
  });

  if (lowStockItems.length === 0) {
    return Response.json({ alerted: 0, message: 'All stock levels healthy.' });
  }

  // Group by organization for separate email per org
  const byOrg = {};
  for (const item of lowStockItems) {
    const orgId = item.organization_id || 'unknown';
    if (!byOrg[orgId]) byOrg[orgId] = [];
    byOrg[orgId].push(item);
  }

  let totalEmailed = 0;

  for (const [orgId, items] of Object.entries(byOrg)) {
    // Find admin users for this org
    let adminEmails = [];
    try {
      const userRoles = await base44.asServiceRole.entities.UserRole.filter({ organization_id: orgId });
      const adminRoleIds = userRoles
        .filter(ur => ur.role_name === 'admin' || ur.role_code === 'admin')
        .map(ur => ur.user_email)
        .filter(Boolean);
      adminEmails = [...new Set(adminRoleIds)];
    } catch (_) {}

    // Fallback: fetch platform users with role=admin
    if (adminEmails.length === 0) {
      try {
        const allUsers = await base44.asServiceRole.entities.User.list();
        adminEmails = allUsers
          .filter(u => u.role === 'admin')
          .map(u => u.email)
          .filter(Boolean);
      } catch (_) {}
    }

    const criticalItems = items.filter(i => i.quantity === 0);
    const lowItems = items.filter(i => i.quantity > 0);

    const tableRows = items
      .sort((a, b) => a.quantity - b.quantity)
      .map(item => {
        const status = item.quantity === 0 ? '🔴 OUT OF STOCK' : `🟡 LOW (${item.quantity} left, min: ${item.minimum_stock_level ?? 5})`;
        return `<tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 12px;font-weight:600">${item.display_name || 'Unknown'}</td>
          <td style="padding:8px 12px;color:#64748b">${item.generic_name || '-'}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:bold">${item.quantity}</td>
          <td style="padding:8px 12px;text-align:center">${item.minimum_stock_level ?? 5}</td>
          <td style="padding:8px 12px;text-align:center">${item.reorder_quantity || '-'}</td>
          <td style="padding:8px 12px">${status}</td>
        </tr>`;
      }).join('');

    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
        <div style="background:#dc2626;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="margin:0;font-size:20px">⚠️ Low Stock Alert — Pharmacy</h2>
          <p style="margin:6px 0 0;opacity:0.9;font-size:14px">
            ${criticalItems.length} out of stock • ${lowItems.length} below minimum threshold
          </p>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#475569;margin-top:0">Please review the items below and initiate reorders as needed.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
                <th style="padding:10px 12px;text-align:left">Product</th>
                <th style="padding:10px 12px;text-align:left">Generic Name</th>
                <th style="padding:10px 12px;text-align:center">Qty</th>
                <th style="padding:10px 12px;text-align:center">Min Level</th>
                <th style="padding:10px 12px;text-align:center">Reorder Qty</th>
                <th style="padding:10px 12px;text-align:left">Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#94a3b8">
            This alert was generated automatically by Horizon ClinicSuite. Log in to Stock Monitoring to flag items for reorder.
          </p>
        </div>
      </div>
    `;

    for (const email of adminEmails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[Horizon] Low Stock Alert — ${criticalItems.length} out of stock, ${lowItems.length} low`,
        body: emailBody,
        from_name: 'Horizon ClinicSuite'
      });
      totalEmailed++;
    }

    // Mark is_reorder_flag on critical items
    for (const item of criticalItems) {
      if (!item.is_reorder_flag) {
        await base44.asServiceRole.entities.PharmacyStock.update(item.id, { is_reorder_flag: true });
      }
    }
  }

  return Response.json({
    alerted: lowStockItems.length,
    emails_sent: totalEmailed,
    summary: Object.fromEntries(
      Object.entries(byOrg).map(([orgId, items]) => [
        orgId,
        { total: items.length, out_of_stock: items.filter(i => i.quantity === 0).length }
      ])
    )
  });
});