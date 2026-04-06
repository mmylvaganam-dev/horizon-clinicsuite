import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both user-triggered and scheduled automation (service role)
    let callerEmail = 'system';
    try {
      const user = await base44.auth.me();
      if (user) callerEmail = user.email;
    } catch (_) { /* scheduled call — no user session */ }

    const body = await req.json().catch(() => ({}));
    // Support explicit month override or default to previous calendar month
    let targetMonth = body.month; // optional: "2025-03"
    if (!targetMonth) {
      const now = new Date();
      // Default: generate for previous month
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    }

    // If organization_id is provided, restrict to that org; otherwise process all
    const targetOrgId = body.organization_id || null;

    const [year, month] = targetMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const periodLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Fetch all credit sales in the period
    const allSales = await base44.asServiceRole.entities.PharmacySaleHeader.filter({ status: 'credit' });
    const periodSales = allSales.filter(s => {
      const d = new Date(s.sale_date);
      return d >= monthStart && d <= monthEnd && (!targetOrgId || s.organization_id === targetOrgId);
    });

    // Group by organization + institution
    const groups = {};
    for (const sale of periodSales) {
      let institution = null;
      const billToMatch = sale.notes?.match(/Bill To:\s*([^|]+)/);
      if (billToMatch) institution = billToMatch[1].trim();
      if (!institution && sale.customer_id) {
        // Try looking up institution by id
        try {
          const insts = await base44.asServiceRole.entities.Institution.filter({ organization_id: sale.organization_id });
          const inst = insts.find(i => i.id === sale.customer_id);
          if (inst) institution = inst.institution_name;
        } catch (_) {}
      }
      if (!institution) institution = 'Unknown Institution';

      const key = `${sale.organization_id}|${institution}`;
      if (!groups[key]) groups[key] = { orgId: sale.organization_id, institution, sales: [] };
      groups[key].sales.push(sale);
    }

    const results = [];

    for (const key of Object.keys(groups)) {
      const { orgId, institution, sales } = groups[key];

      // Skip if already generated for this period
      const existing = await base44.asServiceRole.entities.CreditMonthlyInvoice.filter({
        organization_id: orgId,
        institution_name: institution,
        period_month: targetMonth,
      });
      if (existing.length > 0) {
        results.push({ institution, status: 'skipped', reason: 'already_exists', invoice_number: existing[0].invoice_number });
        continue;
      }

      const subtotal = sales.reduce((s, x) => s + (x.total || 0), 0);

      // Payments received during this period for this institution
      const allPayments = await base44.asServiceRole.entities.CreditPayment.filter({ organization_id: orgId, institution_name: institution });
      const periodPayments = allPayments.filter(p => {
        const d = new Date(p.payment_date);
        return d >= monthStart && d <= monthEnd;
      });
      const paymentsReceived = periodPayments.reduce((s, p) => s + (p.amount || 0), 0);

      // Opening balance = total sales before this period - total payments before this period
      const priorSales = allSales.filter(s => {
        const d = new Date(s.sale_date);
        return d < monthStart && s.organization_id === orgId &&
          (s.notes?.includes(`Bill To: ${institution}`) || s.customer_id);
      });
      const priorSalesTotal = priorSales.reduce((s, x) => s + (x.total || 0), 0);
      const priorPayments = allPayments.filter(p => new Date(p.payment_date) < monthStart);
      const priorPaymentsTotal = priorPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const openingBalance = priorSalesTotal - priorPaymentsTotal;
      const closingBalance = openingBalance + subtotal - paymentsReceived;

      // Look up institution contact
      let institutionEmail = null;
      try {
        const insts = await base44.asServiceRole.entities.Institution.filter({ organization_id: orgId, institution_name: institution });
        institutionEmail = insts[0]?.contact_email || null;
      } catch (_) {}

      // Build invoice number
      const monthStr = String(month).padStart(2, '0');
      const slug = institution.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
      const invoiceNumber = `CRI-${year}-${monthStr}-${slug}`;

      // Due date: end of next month
      const dueDate = new Date(year, month, 0); // last day of current month
      const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

      const invoice = await base44.asServiceRole.entities.CreditMonthlyInvoice.create({
        organization_id: orgId,
        institution_name: institution,
        institution_email: institutionEmail,
        invoice_number: invoiceNumber,
        period_month: targetMonth,
        period_label: periodLabel,
        sales_count: sales.length,
        subtotal,
        payments_received: paymentsReceived,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        status: 'issued',
        email_sent: false,
        due_date: dueDateStr,
        generated_by: callerEmail,
        sale_ids: sales.map(s => s.id),
      });

      results.push({ institution, status: 'created', invoice_number: invoiceNumber, subtotal, closing_balance: closingBalance });
    }

    return Response.json({ success: true, month: targetMonth, period_label: periodLabel, invoices: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});