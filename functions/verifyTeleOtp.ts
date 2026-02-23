import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return Response.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const patients = await base44.asServiceRole.entities.TelePatient.filter({ email: email.toLowerCase().trim() });

    if (patients.length === 0) {
      return Response.json({ error: 'Invalid code. Please try again.' }, { status: 401 });
    }

    const patient = patients[0];

    if (!patient.tele_access_enabled) {
      return Response.json({ error: 'Telemedicine access is not enabled for this account.' }, { status: 403 });
    }

    if (!patient.otp_code || patient.otp_code !== otp.trim()) {
      return Response.json({ error: 'Invalid code. Please try again.' }, { status: 401 });
    }

    const now = new Date();
    const expires = new Date(patient.otp_expires_at);
    if (now > expires) {
      return Response.json({ error: 'Code has expired. Please request a new one.' }, { status: 401 });
    }

    // Clear OTP after successful use, update last login
    await base44.asServiceRole.entities.TelePatient.update(patient.id, {
      otp_code: null,
      otp_expires_at: null,
      last_login: new Date().toISOString()
    });

    // Return patient data (acts as session token stored in localStorage)
    return Response.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        patient_id: patient.patient_id,
        organization_id: patient.organization_id
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});