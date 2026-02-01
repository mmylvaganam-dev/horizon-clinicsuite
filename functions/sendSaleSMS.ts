import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone, message, patient_name } = await req.json();

    if (!phone || !message) {
      return Response.json({ error: 'Phone and message required' }, { status: 400 });
    }

    // Get company SMS settings
    const companies = await base44.asServiceRole.entities.CompanyProfile.list();
    const company = companies[0];

    if (!company || company.sms_api_provider === 'none' || !company.sms_api_key) {
      console.log('SMS not configured, skipping SMS notification');
      return Response.json({ success: true, message: 'SMS not configured' });
    }

    // Send SMS based on provider
    if (company.sms_api_provider === 'twilio') {
      const accountSid = company.sms_api_key;
      const authToken = company.sms_api_secret;
      const fromPhone = company.sms_sender_id;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: fromPhone,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Twilio error:', error);
        return Response.json({ success: false, error: 'Failed to send SMS' }, { status: 500 });
      }

      return Response.json({ success: true, message: 'SMS sent via Twilio' });
    }

    // Add other providers (Dialog, Mobitel) here as needed

    return Response.json({ success: true, message: 'SMS provider not implemented' });
  } catch (error) {
    console.error('SMS error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});