import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find TelePatient by email
    const patients = await base44.asServiceRole.entities.TelePatient.filter({ email: email.toLowerCase().trim() });

    if (patients.length === 0) {
      // Don't reveal whether patient exists — security best practice
      return Response.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
    }

    const patient = patients[0];

    if (!patient.tele_access_enabled) {
      return Response.json({ error: 'Telemedicine access is not enabled for this account. Please contact your clinic.' }, { status: 403 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP
    await base44.asServiceRole.entities.TelePatient.update(patient.id, {
      otp_code: otp,
      otp_expires_at: expiresAt
    });

    // Send email via base44 integration
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'Your Telemedicine Login Code',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0d9488;">Virtual Consultation Login</h2>
          <p>Hello ${patient.name},</p>
          <p>Your one-time login code is:</p>
          <div style="background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0d9488;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    return Response.json({ success: true, message: 'OTP sent successfully.' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});