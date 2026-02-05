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
    
    // Fetch organization data
    const organizations = await base44.entities.Organization.list();
    const organization = organizations.find(o => o.id === currentSale.organization_id);
    
    // Fetch company profile for this organization
    const companies = await base44.entities.CompanyProfile.filter({ 
      organization_id: currentSale.organization_id 
    });
    const company = companies[0];
    const currency = company?.base_currency || 'LKR';

    // Fetch organization branding for logo
    const brandings = await base44.entities.OrganizationBranding.filter({ 
      organization_id: currentSale.organization_id 
    });
    const branding = brandings[0];
    const logoUrl = branding?.receipt_logo_file_ref || branding?.primary_logo_file_ref || null;

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
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box;
          }
          body { 
            font-family: 'Courier New', monospace;
            color: #000;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            font-size: 11px;
          }
          .container { 
            width: 100%;
          }
          .header { 
            text-align: center; 
            margin-bottom: 10px; 
            border-bottom: 1px dashed #000; 
            padding-bottom: 10px; 
          }
          .header img {
            max-height: 50px;
            max-width: 65mm;
            margin-bottom: 5px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .header h1 { 
            font-size: 16px; 
            margin-bottom: 3px;
            font-weight: bold;
          }
          .header p { 
            font-size: 10px; 
            color: #000;
            margin: 2px 0;
          }
          .invoice-details { 
            margin-bottom: 10px;
            font-size: 10px;
          }
          .detail-box { 
            margin-bottom: 8px;
          }
          .detail-box h3 { 
            font-size: 11px; 
            font-weight: bold; 
            margin-bottom: 3px;
            text-decoration: underline;
          }
          .detail-box p { 
            margin: 1px 0;
            line-height: 1.3;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 10px;
            font-size: 10px;
          }
          th { 
            background-color: transparent;
            padding: 4px 2px;
            text-align: left; 
            font-size: 10px; 
            font-weight: bold;
            border-bottom: 1px solid #000;
          }
          td { 
            padding: 4px 2px;
            font-size: 10px;
            border-bottom: 1px dashed #ddd;
          }
          .item-name {
            font-weight: bold;
          }
          .amount { 
            text-align: right; 
          }
          .summary { 
            margin-top: 10px;
            font-size: 11px;
            border-top: 1px solid #000;
            padding-top: 8px;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 3px 0;
          }
          .summary-row.total { 
            font-weight: bold; 
            font-size: 13px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            margin-top: 5px;
          }
          .footer { 
            text-align: center; 
            font-size: 9px;
            margin-top: 15px; 
            padding-top: 10px; 
            border-top: 1px dashed #000; 
          }
          .footer p {
            margin: 2px 0;
          }
          @media print {
            body { 
              margin: 0;
              padding: 5mm;
              width: 80mm;
            }
            .container { 
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 50px; max-width: 65mm; margin-bottom: 5px; display: block; margin-left: auto; margin-right: auto;">` : ''}
            <h1>${organization?.name || company?.company_trade_name || 'PHARMACY'}</h1>
            <p>${company?.company_legal_name || ''}</p>
            ${organization?.address ? `<p>${organization.address}</p>` : ''}
            ${organization?.phone ? `<p>Tel: ${organization.phone}</p>` : ''}
          </div>

          <div class="invoice-details">
            <div class="detail-box">
              <h3>CUSTOMER</h3>
              <p>${patientInfo.name}</p>
              ${patientInfo.phn ? `<p>PHN: ${patientInfo.phn}</p>` : ''}
              ${patientInfo.phone ? `<p>Tel: ${patientInfo.phone}</p>` : ''}
            </div>
            <div class="divider"></div>
            <div class="detail-box">
              <p><strong>Invoice:</strong> ${currentSale.id.slice(0, 8)}</p>
              <p><strong>Date:</strong> ${new Date(currentSale.sale_date).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${new Date(currentSale.sale_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Item</th>
                <th style="text-align: center; width: 15%;">Qty</th>
                <th class="amount" style="width: 22%;">Price</th>
                <th class="amount" style="width: 23%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${saleItems.map(item => {
                const formatAmount = (amt) => parseFloat(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `
                <tr>
                  <td class="item-name">${item.item_name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td class="amount">${formatAmount(item.unit_price)}</td>
                  <td class="amount">${formatAmount(item.line_total)}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${currency} ${parseFloat(currentSale.total - currentSale.tax).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>Tax:</span>
              <span>${currency} ${parseFloat(currentSale.tax).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row total">
              <span>TOTAL:</span>
              <span>${currency} ${parseFloat(currentSale.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          ${currentSale.notes ? `
            <div class="divider"></div>
            <div style="margin-bottom: 10px; font-size: 10px;">
              <strong>Notes:</strong> ${currentSale.notes}
            </div>
          ` : ''}

          <div class="footer">
            <p>** THANK YOU **</p>
            <p>Please visit again!</p>
            <p style="margin-top: 5px; font-size: 8px;">Powered by Horizon ClinicSuite</p>
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