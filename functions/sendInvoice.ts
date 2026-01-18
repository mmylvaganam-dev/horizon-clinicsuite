import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method, recipient, sale_data } = await req.json();

    if (!method || !recipient || !sale_data) {
      return Response.json({ error: 'method, recipient, and sale_data required' }, { status: 400 });
    }

    const { 
      currency, subtotal, discount_amount, tax, total, items, 
      receipt_number, customer_name, organization_name, 
      location_address, location_phone, sale_datetime 
    } = sale_data;

    // Create invoice text
    const invoiceText = `
${organization_name || 'PHARMACY'}
${location_address || ''}
${location_phone ? `Tel: ${location_phone}` : ''}

INVOICE
Receipt: ${receipt_number}
Customer: ${customer_name}
Date & Time: ${sale_datetime}

Items:
${items.map(item => `${item.display_name} x${item.quantity} - ${currency} ${item.total.toFixed(2)}`).join('\n')}

Subtotal: ${currency} ${subtotal.toFixed(2)}
${discount_amount > 0 ? `Discount: -${currency} ${discount_amount.toFixed(2)}\n` : ''}Tax: ${currency} ${tax.toFixed(2)}
TOTAL: ${currency} ${total.toFixed(2)}

Thank you for your purchase!
Please retain this receipt for your records.
    `.trim();

    if (method === 'email') {
      // Send email
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject: `Invoice ${receipt_number}`,
        body: invoiceText
      });
      
      return Response.json({ success: true, message: 'Invoice emailed successfully' });
    } else if (method === 'sms') {
      // For SMS, we'll just return success - in production you'd integrate with SMS provider
      return Response.json({ 
        success: true, 
        message: 'SMS functionality requires SMS provider integration',
        note: 'Invoice text ready to send'
      });
    }

    return Response.json({ error: 'Invalid method' }, { status: 400 });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});