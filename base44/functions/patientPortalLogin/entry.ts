import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Patient Portal Login via OTP (SMS)
 * Actions: request_otp | verify_otp
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── Request OTP ────────────────────────────────────────────────────────────
    if (action === 'request_otp') {
      const { mobile } = body;
      if (!mobile) return Response.json({ error: 'Mobile number required' }, { status: 400 });

      // Find patient by mobile
      const patients = await base44.asServiceRole.entities.Patient.filter({ mobile });
      if (patients.length === 0) {
        // Also try phone field
        const byPhone = await base44.asServiceRole.entities.Patient.filter({ phone: mobile });
        if (byPhone.length === 0) {
          return Response.json({ error: 'No patient found with this mobile number' }, { status: 404 });
        }
        patients.push(...byPhone);
      }

      const patient = patients[0];

      // Check portal is enabled for this patient
      if (!patient.portal_enabled) {
        return Response.json({
          error: 'Patient portal is not enabled for this account. Please contact your clinic.',
        }, { status: 403 });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

      // Store OTP in SmsTokenCache (reusing existing entity)
      await base44.asServiceRole.entities.SmsTokenCache.create({
        token: otp,
        patient_id: patient.id,
        mobile: mobile,
        expires_at: expiresAt,
        purpose: 'portal_otp',
      });

      // Send OTP via Dialog eSMS
      const esmsUser = Deno.env.get('ESMS_USERNAME');
      const esmsPass = Deno.env.get('ESMS_PASSWORD');

      if (!esmsUser || !esmsPass) {
        return Response.json({ error: 'SMS service not configured' }, { status: 500 });
      }

      const message = `Your Horizon ClinicSuite portal login OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;

      // Sanitize mobile - remove leading + or 0, ensure it starts with 94 for Sri Lanka
      let sanitizedMobile = mobile.replace(/\s+/g, '').replace(/^\+/, '');
      if (sanitizedMobile.startsWith('0')) {
        sanitizedMobile = '94' + sanitizedMobile.slice(1);
      }
      if (!sanitizedMobile.startsWith('94')) {
        sanitizedMobile = '94' + sanitizedMobile;
      }

      const esmsUrl = `https://e-sms.dialog.lk/api/v2/message/send`;
      const smsPayload = {
        username: esmsUser,
        password: esmsPass,
        message,
        to: sanitizedMobile,
        source_address: 'HorizonHC',
      };

      const smsRes = await fetch(esmsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsPayload),
      });

      const smsData = await smsRes.json();
      console.log('Dialog eSMS response:', JSON.stringify(smsData));

      return Response.json({
        ok: true,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        masked_mobile: mobile.slice(0, -4).replace(/\d/g, '*') + mobile.slice(-4),
      });
    }

    // ── Verify OTP ─────────────────────────────────────────────────────────────
    if (action === 'verify_otp') {
      const { mobile, otp } = body;
      if (!mobile || !otp) {
        return Response.json({ error: 'Mobile and OTP required' }, { status: 400 });
      }

      // Find OTP record
      const tokens = await base44.asServiceRole.entities.SmsTokenCache.filter({
        mobile,
        token: otp,
        purpose: 'portal_otp',
      });

      if (tokens.length === 0) {
        return Response.json({ error: 'Invalid OTP. Please try again.' }, { status: 401 });
      }

      const tokenRecord = tokens[0];

      // Check expiry
      const expiresAt = new Date(tokenRecord.expires_at);
      if (new Date() > expiresAt) {
        return Response.json({ error: 'OTP has expired. Please request a new one.' }, { status: 401 });
      }

      // Generate session token (UUID-style)
      const sessionToken = crypto.randomUUID();
      const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours

      // Store session token
      await base44.asServiceRole.entities.SmsTokenCache.create({
        token: sessionToken,
        patient_id: tokenRecord.patient_id,
        mobile,
        expires_at: sessionExpiry,
        purpose: 'portal_session',
      });

      // Delete used OTP
      await base44.asServiceRole.entities.SmsTokenCache.delete(tokenRecord.id);

      // Fetch patient info
      const patients = await base44.asServiceRole.entities.Patient.filter({ id: tokenRecord.patient_id });
      const patient = patients[0];

      return Response.json({
        ok: true,
        session_token: sessionToken,
        patient_id: tokenRecord.patient_id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('patientPortalLogin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});