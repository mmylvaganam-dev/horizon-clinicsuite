import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method, recipient, sale_data, company_id } = await req.json();

    if (!method || !recipient || !sale_data) {
      return Response.json({ error: 'method, recipient, and sale_data required' }, { status: 400 });
    }

    // Get company profile for email domain and SMS config
    let companyProfile = null;
    if (company_id) {
      companyProfile = await base44.asServiceRole.entities.CompanyProfile.get(company_id);
    } else {
      const companies = await base44.asServiceRole.entities.CompanyProfile.list();
      companyProfile = companies[0];
    }

    const { 
      currency, subtotal, discount_amount, tax, total, total_savings, items, 
      receipt_number, customer_name, organization_name, 
      location_address, location_phone, sale_datetime 
    } = sale_data;

    if (method === 'email') {
      // Create HTML email body
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">${organization_name || 'PHARMACY'}</h1>
            ${location_address ? `<p style="margin: 5px 0; font-size: 12px;">${location_address}</p>` : ''}
            ${location_phone ? `<p style="margin: 5px 0; font-size: 12px;">Tel: ${location_phone}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Receipt:</strong> ${receipt_number}</p>
            <p style="margin: 5px 0;"><strong>Customer:</strong> ${customer_name}</p>
            <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${sale_datetime}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.display_name}</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${currency} ${item.unit_price.toFixed(2)}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${currency} ${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 20px;">
            <p style="margin: 5px 0;"><strong>Subtotal:</strong> ${currency} ${subtotal.toFixed(2)}</p>
            ${discount_amount > 0 ? `<p style="margin: 5px 0; color: green;"><strong>Discount:</strong> -${currency} ${discount_amount.toFixed(2)}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Tax:</strong> ${currency} ${tax.toFixed(2)}</p>
            <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">TOTAL: ${currency} ${total.toFixed(2)}</p>
          </div>
          
          ${total_savings > 0 ? `
          <div style="background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
            <p style="color: #065f46; font-weight: bold; font-size: 16px; margin: 0;">
              🎉 You Saved ${currency} ${total_savings.toFixed(2)} from MRP!
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="margin: 5px 0; font-size: 12px;">Thank you for your purchase!</p>
            <p style="margin: 5px 0; font-size: 12px;">Please retain this receipt for your records</p>
          </div>
        </div>
      `;

      // Determine from email address
      const fromName = organization_name || 'Pharmacy';
      const fromEmail = companyProfile?.email_domain 
        ? `bill@${companyProfile.email_domain}`
        : undefined;

      await base44.integrations.Core.SendEmail({
        from_name: fromName,
        to: recipient,
        subject: `Invoice ${receipt_number} - ${organization_name}`,
        body: emailBody
      });
      
      return Response.json({ success: true, message: 'Invoice emailed successfully' });
      
    } else if (method === 'sms') {
      // Check SMS configuration
      if (!companyProfile?.sms_api_provider || companyProfile.sms_api_provider === 'none') {
        return Response.json({ 
          error: 'SMS provider not configured. Please configure SMS settings in Company Profile.' 
        }, { status: 400 });
      }

      // Create SMS text
      const smsText = `
${organization_name || 'PHARMACY'}
Invoice: ${receipt_number}
Customer: ${customer_name}
Total: ${currency} ${total.toFixed(2)}
${total_savings > 0 ? `You Saved: ${currency} ${total_savings.toFixed(2)}!` : ''}
Thank you!
      `.trim();

      const provider = companyProfile.sms_api_provider;
      const apiKey = companyProfile.sms_api_key;
      const apiSecret = companyProfile.sms_api_secret;
      const senderId = companyProfile.sms_sender_id;

      if (!apiKey || !senderId) {
        return Response.json({ 
          error: 'SMS API credentials not configured. Please update Company Profile.' 
        }, { status: 400 });
      }

      // Send SMS based on provider
      if (provider === 'twilio') {
        const accountSid = apiKey;
        const authToken = apiSecret;
        const from = senderId;
        
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: recipient,
            From: from,
            Body: smsText
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Twilio SMS failed: ${error}`);
        }
      } else if (provider === 'dialog' || provider === 'mobitel') {
        // Dialog/Mobitel SMS Gateway (Sri Lanka)
        // This is a generic implementation - adjust based on actual API
        const smsApiUrl = provider === 'dialog' 
          ? 'https://api.dialog.lk/sms/send'
          : 'https://api.mobitel.lk/sms/send';
        
        const response = await fetch(smsApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            to: recipient,
            from: senderId,
            message: smsText
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`${provider} SMS failed: ${error}`);
        }
      }

      return Response.json({ success: true, message: 'Invoice sent via SMS successfully' });
    }

    return Response.json({ error: 'Invalid method. Use "email" or "sms"' }, { status: 400 });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});