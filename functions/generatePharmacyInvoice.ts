import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { saleId } = await req.json();

    if (!saleId) {
      return Response.json({ error: 'Sale ID required' }, { status: 400 });
    }

    // Fetch sale header
    const sales = await base44.entities.PharmacySaleHeader.filter({ id: saleId });
    const sale = sales[0];
    
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Fetch sale line items with retry logic
    let saleLines = [];
    let retries = 3;
    while (retries > 0 && saleLines.length === 0) {
      try {
        saleLines = await base44.entities.PharmacySaleLine.filter({ sale_header_id: saleId });
        if (saleLines.length > 0) {
          console.log(`✅ Fetched ${saleLines.length} items for sale ${saleId}`);
          break;
        }
        // If no items found, wait and retry
        if (retries > 1) {
          console.log(`⏳ No items found yet, retrying... (${retries - 1} retries left)`);
          await new Promise(r => setTimeout(r, 500)); // Wait 500ms
        }
      } catch (error) {
        console.error(`❌ Fetch attempt failed: ${error.message}`);
      }
      retries--;
    }
    
    if (saleLines.length === 0) {
      console.warn(`⚠️ No line items found for sale ${saleId} after retries`);
    }
    
    // Fetch organization branding
    const brandings = await base44.entities.OrganizationBranding.filter({ 
      organization_id: sale.organization_id 
    });
    const branding = brandings[0];

    // Fetch patient info
    let customerName = 'Walk-in Customer';
    if (sale.patient_ref) {
      const patients = await base44.entities.Patient.filter({ id: sale.patient_ref });
      if (patients.length > 0) {
        const patient = patients[0];
        customerName = `${patient.first_name} ${patient.last_name}`;
      }
    }

    // Generate items HTML
    const itemsHTML = saleLines.map(item => `
      <div class="item">
        <div class="item-name">${item.product_name_cache || 'Unknown Item'}</div>
        <div class="item-details">
          <span>${item.qty} x Rs ${item.unit_price.toFixed(2)}</span>
          <span><strong>Rs ${item.line_total.toFixed(2)}</strong></span>
        </div>
      </div>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Invoice ${sale.sale_number}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              width: 72mm; margin: 0 auto; padding: 5mm;
              font-size: 11px; line-height: 1.3;
            }
            .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 5px; margin-bottom: 8px; }
            .header h1 { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
            .header p { font-size: 9px; margin: 1px 0; }
            .info { margin-bottom: 8px; font-size: 10px; }
            .info-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .divider { border-top: 1px dashed #333; margin: 5px 0; }
            .items { margin: 5px 0; }
            .item { margin: 3px 0; font-size: 10px; }
            .item-name { font-weight: bold; margin-bottom: 1px; }
            .item-details { display: flex; justify-content: space-between; font-size: 9px; }
            .totals { margin-top: 8px; border-top: 1px solid #333; padding-top: 5px; }
            .total-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; }
            .grand-total { font-weight: bold; font-size: 12px; border-top: 1px solid #333; margin-top: 3px; padding-top: 3px; }
            .footer { text-align: center; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #333; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding?.organization_name || 'Pharmacy'}</h1>
            ${branding?.address ? `<p>${branding.address}</p>` : ''}
            ${branding?.contact_phone ? `<p>Tel: ${branding.contact_phone}</p>` : ''}
          </div>
          
          <div class="info">
            <div class="info-row">
              <span>Receipt:</span>
              <span><strong>${sale.sale_number}</strong></span>
            </div>
            <div class="info-row">
              <span>Customer:</span>
              <span>${customerName}</span>
            </div>
            <div class="info-row">
              <span>Date/Time:</span>
              <span>${new Date(sale.sale_date).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="items">
            ${itemsHTML}
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Rs ${sale.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>Rs ${sale.tax_total.toFixed(2)}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>Rs ${sale.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>REPRINT - ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});