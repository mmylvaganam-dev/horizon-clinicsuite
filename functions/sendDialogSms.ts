import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DIALOG_LOGIN_URL = 'https://e-sms.dialog.lk/api/v2/user/login';
const DIALOG_SEND_URL = 'https://e-sms.dialog.lk/api/v2/sms';

async function getValidToken(base44) {
  try {
    // Check for cached token
    const cached = await base44.asServiceRole.entities.SmsTokenCache.filter({ provider: 'dialog_esms' });
    
    if (cached.length > 0) {
      const tokenData = cached[0];
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      
      // Use token if it has more than 60 seconds remaining
      if (expiresAt.getTime() - now.getTime() > 60000) {
        console.log('Using cached token');
        return tokenData.token;
      }
      
      // Delete expired token
      await base44.asServiceRole.entities.SmsTokenCache.delete(tokenData.id);
    }
    
    // Login to get new token
    console.log('Fetching new token from Dialog eSMS');
    const username = Deno.env.get('ESMS_USERNAME');
    const password = Deno.env.get('ESMS_PASSWORD');
    
    if (!username || !password) {
      throw new Error('ESMS credentials not configured');
    }
    
    const loginResponse = await fetch(DIALOG_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Dialog login failed: ${loginResponse.status} - ${errorText}`);
    }
    
    const loginData = await loginResponse.json();
    
    if (!loginData.token) {
      throw new Error('No token received from Dialog eSMS');
    }
    
    // Cache the token
    const expiresIn = loginData.expiresIn || 3600; // Default 1 hour
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));
    
    await base44.asServiceRole.entities.SmsTokenCache.create({
      provider: 'dialog_esms',
      token: loginData.token,
      expires_at: expiresAt.toISOString()
    });
    
    console.log('Token cached successfully');
    return loginData.token;
  } catch (error) {
    console.error('Token error:', error);
    throw error;
  }
}

function validateMobile(mobile) {
  // Sri Lankan mobile: 9 digits starting with 7
  const cleaned = mobile.replace(/\s+/g, '');
  return /^7\d{8}$/.test(cleaned) ? cleaned : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { mobiles, message, sourceAddress, pushUrl, organizationId } = await req.json();
    
    if (!mobiles || !Array.isArray(mobiles) || mobiles.length === 0) {
      return Response.json({ error: 'Mobiles array required' }, { status: 400 });
    }
    
    if (!message || message.trim().length === 0) {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }
    
    if (mobiles.length > 1000) {
      return Response.json({ error: 'Maximum 1000 recipients per request' }, { status: 400 });
    }
    
    // Validate and clean mobile numbers
    const validMobiles = [];
    const invalidMobiles = [];
    
    for (const mobile of mobiles) {
      const cleaned = validateMobile(mobile);
      if (cleaned) {
        validMobiles.push(cleaned);
      } else {
        invalidMobiles.push(mobile);
      }
    }
    
    if (validMobiles.length === 0) {
      return Response.json({ 
        error: 'No valid mobile numbers', 
        invalidMobiles 
      }, { status: 400 });
    }
    
    // Get token
    const token = await getValidToken(base44);
    
    // Generate unique transaction ID (timestamp + random)
    const transactionId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Prepare Dialog eSMS payload
    const dialogPayload = {
      msisdn: validMobiles.map(mobile => ({ mobile })),
      message: message.trim(),
      transaction_id: parseInt(transactionId)
    };
    
    if (sourceAddress) {
      dialogPayload.sourceAddress = sourceAddress;
    }
    
    if (pushUrl) {
      dialogPayload.push_notification_url = pushUrl;
    }
    
    // Send SMS via Dialog
    console.log('Sending SMS to', validMobiles.length, 'recipients');
    const sendResponse = await fetch(DIALOG_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dialogPayload)
    });
    
    const responseData = await sendResponse.json();
    console.log('Dialog response:', responseData);
    
    // Log to database
    const outboxEntry = {
      organization_id: organizationId || null,
      sent_by_user_id: user.id,
      sent_by_email: user.email,
      mobiles: validMobiles,
      message: message.trim(),
      transaction_id: transactionId,
      campaign_id: responseData.campaignId || null,
      source_address: sourceAddress || null,
      provider_status: sendResponse.ok ? 'sent' : 'failed',
      err_code: responseData.errCode ? String(responseData.errCode) : null,
      provider_comment: responseData.comment || null,
      recipient_count: validMobiles.length
    };
    
    await base44.asServiceRole.entities.SmsOutbox.create(outboxEntry);
    
    return Response.json({
      status: sendResponse.ok ? 'success' : 'failed',
      campaignId: responseData.campaignId,
      comment: responseData.comment,
      errCode: responseData.errCode,
      sentCount: validMobiles.length,
      invalidMobiles: invalidMobiles.length > 0 ? invalidMobiles : undefined,
      transactionId
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});