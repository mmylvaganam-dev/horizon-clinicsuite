import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invoiceId } = await req.json();

    if (!invoiceId) return Response.json({ error: 'Invoice ID required' }, { status: 400 });

    const invoices = await base44.entities.HomeCareInvoice.filter({ id: invoiceId });
    const invoice = invoices[0];
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const lines = await base44.entities.HomeCareInvoiceLine.filter({ invoice_id: invoiceId });

    const brandings = await base44.entities.OrganizationBranding.filter({ organization_id: invoice.organization_id });
    const branding = brandings[0];

    const fmt = (n) => (n || 0).toFixed(2);

    const lineTypeLabel = { home_service: 'Home Service', pharmacy_supply: 'Pharmacy Supply', lab_test: 'Lab Test', other: 'Other' };

    const linesHTML = lines.map(l => `
      <div class="item">
        <div class="item-name">${l.description}</div>
        <div class="item-meta">${lineTypeLabel[l.line_type] || ''}${l.service_date ? ' · ' + l.service_date : ''}</div>
        <div class="item-details">
          <span>${l.qty} x Rs ${fmt(l.unit_price)}</span>
          <span><strong>Rs ${fmt(l.line_total)}</strong></span>
        </div>
      </div>
    `).join('');

    const statusLabel = { draft: 'DRAFT', issued: 'ISSUED', paid: 'PAID', partial: 'PARTIAL PAYMENT', cancelled: 'CANCELLED' };

    const html = `
<html>
<head>
  <title>Home Care Invoice ${invoice.invoice_number || ''}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 5mm; font-size: 11px; line-height: 1.4; }
    .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 6px; margin-bottom: 8px; }
    .header h1 { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
    .header p { font-size: 9px; margin: 1px 0; }
    .tag { display: inline-block; font-size: 9px; border: 1px solid #333; padding: 1px 4px; margin-top: 3px; letter-spacing: 1px; }
    .section-title { font-weight: bold; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin: 6px 0 2px; border-bottom: 1px solid #ccc; }
    .info-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; }
    .divider { border-top: 1px dashed #333; margin: 5px 0; }
    .item { margin: 4px 0; font-size: 10px; }
    .item-name { font-weight: bold; }
    .item-meta { font-size: 8px; color: #555; margin-bottom: 1px; }
    .item-details { display: flex; justify-content: space-between; font-size: 9px; }
    .daily-row { display: flex; justify-content: space-between; font-size: 10px; margin: 3px 0; }
    .totals { margin-top: 6px; border-top: 1px solid #333; padding-top: 5px; }
    .total-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; }
    .grand-total { font-weight: bold; font-size: 13px; border-top: 1px solid #333; margin-top: 4px; padding-top: 4px; }
    .payment-row { font-size: 10px; display: flex; justify-content: space-between; margin: 2px 0; }
    .footer { text-align: center; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #333; font-size: 9px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${branding?.organization_name || 'Home Care Services'}</h1>
    ${branding?.address ? `<p>${branding.address}</p>` : ''}
    ${branding?.contact_phone ? `<p>Tel: ${branding.contact_phone}</p>` : ''}
    <div class="tag">HOME CARE INVOICE</div>
  </div>

  <div class="section-title">Invoice Details</div>
  <div class="info-row"><span>Invoice #:</span><span><strong>${invoice.invoice_number || invoiceId.slice(-6).toUpperCase()}</strong></span></div>
  <div class="info-row"><span>Date Issued:</span><span>${invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : new Date().toLocaleDateString()}</span></div>
  <div class="info-row"><span>Status:</span><span>${statusLabel[invoice.status] || invoice.status}</span></div>

  <div class="section-title">Patient</div>
  <div class="info-row"><span>Name:</span><span>${invoice.patient_name}</span></div>
  ${invoice.patient_phone ? `<div class="info-row"><span>Phone:</span><span>${invoice.patient_phone}</span></div>` : ''}
  ${invoice.patient_address ? `<div class="info-row"><span>Address:</span><span style="max-width:130px;text-align:right;">${invoice.patient_address}</span></div>` : ''}

  <div class="section-title">Service Period</div>
  <div class="info-row"><span>From:</span><span>${invoice.service_from}</span></div>
  <div class="info-row"><span>To:</span><span>${invoice.service_to}</span></div>
  <div class="info-row"><span>Days:</span><span>${invoice.num_days || 0}</span></div>

  <div class="divider"></div>

  <div class="section-title">Daily Care Charge</div>
  <div class="daily-row">
    <span>${invoice.num_days || 0} days × Rs ${fmt(invoice.daily_rate)}/day</span>
    <span><strong>Rs ${fmt(invoice.daily_subtotal)}</strong></span>
  </div>

  ${lines.length > 0 ? `
  <div class="divider"></div>
  <div class="section-title">Additional Services & Supplies</div>
  ${linesHTML}
  ` : ''}

  <div class="totals">
    <div class="total-row"><span>Daily Care:</span><span>Rs ${fmt(invoice.daily_subtotal)}</span></div>
    <div class="total-row"><span>Services & Supplies:</span><span>Rs ${fmt(invoice.items_subtotal)}</span></div>
    <div class="total-row grand-total"><span>TOTAL:</span><span>Rs ${fmt(invoice.grand_total)}</span></div>
    ${invoice.amount_paid > 0 ? `
    <div class="payment-row"><span>Paid (${invoice.payment_method || ''}):</span><span>Rs ${fmt(invoice.amount_paid)}</span></div>
    <div class="payment-row" style="font-weight:bold;"><span>Balance Due:</span><span>Rs ${fmt(invoice.grand_total - invoice.amount_paid)}</span></div>
    ` : ''}
  </div>

  ${invoice.notes ? `<div class="footer" style="text-align:left;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

  <div class="footer">
    <p>Thank you for choosing our Home Care Services</p>
    <p>Printed: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});