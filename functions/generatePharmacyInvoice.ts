import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saleId } = await req.json();

    // Fetch sale and related data
    const sale = await base44.entities.PharmacySale.list();
    const currentSale = sale.find(s => s.id === saleId);
    if (!currentSale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const saleItems = await base44.entities.PharmacySaleItem.filter({ sale_id: saleId });
    const companies = await base44.entities.CompanyProfile.list();
    const company = companies[0];
    const currency = company?.base_currency || 'LKR';

    // Fetch organization branding for logo
    const brandings = await base44.entities.OrganizationBranding.filter({ 
      organization_id: currentSale.organization_id 
    });
    const branding = brandings[0];
    const logoUrl = branding?.primary_logo_file_ref || null;

    let patientInfo = { name: 'Walk-in Customer', phone: '', mobile: '' };
    if (currentSale.patient_id) {
      const patients = await base44.entities.Patient.list();
      const patient = patients.find(p => p.id === currentSale.patient_id);
      if (patient) {
        patientInfo = {
          name: `${patient.first_name} ${patient.last_name}`,
          phone: patient.phone || '',
          mobile: patient.mobile || '',
          phn: patient.phn || ''
        };
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice</title>
        <style>
          * { margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { font-size: 12px; color: #666; }
          .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .detail-box { font-size: 12px; }
          .detail-box h3 { font-size: 12px; font-weight: bold; margin-bottom: 8px; }
          .detail-box p { margin-bottom: 3px; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f0f0f0; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; border: 1px solid #ddd; }
          td { padding: 10px; font-size: 12px; border: 1px solid #ddd; }
          .amount { text-align: right; }
          .summary { margin-left: auto; width: 300px; margin-bottom: 30px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; }
          .summary-row.total { font-weight: bold; font-size: 14px; border-top: 2px solid #333; padding-top: 10px; }
          .footer { text-align: center; font-size: 10px; color: #666; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; }
          .print-hidden { display: none; }
          @media print {
            body { margin: 0; padding: 0; }
            .container { max-width: 100%; }
            .print-hidden { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 10px;">` : ''}
            <h1>${company?.company_trade_name || 'PHARMACY'}</h1>
            <p>${company?.company_legal_name || ''}</p>
            ${company?.email_domain ? `<p>${company.email_domain}</p>` : ''}
          </div>

          <div class="invoice-details">
            <div class="detail-box">
              <h3>BILL TO:</h3>
              <p><strong>${patientInfo.name}</strong></p>
              ${patientInfo.phn ? `<p>PHN: ${patientInfo.phn}</p>` : ''}
              ${patientInfo.phone ? `<p>Phone: ${patientInfo.phone}</p>` : ''}
              ${patientInfo.mobile ? `<p>Mobile: ${patientInfo.mobile}</p>` : ''}
            </div>
            <div class="detail-box" style="text-align: right;">
              <p><strong>Invoice #:</strong> ${currentSale.id}</p>
              <p><strong>Date:</strong> ${new Date(currentSale.sale_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(currentSale.sale_date).toLocaleTimeString()}</p>
              <p><strong>Status:</strong> ${currentSale.status}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Quantity</th>
                <th class="amount">Unit Price</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${saleItems.map(item => `
                <tr>
                  <td>${item.item_name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td class="amount">${currency} ${item.unit_price.toFixed(2)}</td>
                  <td class="amount">${currency} ${item.line_total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${currency} ${(currentSale.total - currentSale.tax).toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Tax:</span>
              <span>${currency} ${currentSale.tax.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>TOTAL:</span>
              <span>${currency} ${currentSale.total.toFixed(2)}</span>
            </div>
          </div>

          ${currentSale.notes ? `
            <div style="margin-bottom: 20px; font-size: 12px; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd;">
              <strong>Notes:</strong><br>
              ${currentSale.notes}
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice</p>
          </div>
        </div>

        <script>
          window.addEventListener('load', function() {
            window.print();
          });
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});