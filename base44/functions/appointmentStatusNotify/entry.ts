import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered by entity automation on Appointment update
// when status changes to 'confirmed' or 'rescheduled'
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;
    const appointment = data;

    if (!appointment) {
      return Response.json({ error: 'No appointment data in payload' }, { status: 400 });
    }

    const status = appointment.status;
    const appointmentId = event?.entity_id || appointment.id;

    console.log(`Appointment ${appointmentId} status changed to: ${status}`);

    // Fetch patient details
    const patients = await base44.asServiceRole.entities.Patient.filter({ id: appointment.patient_id });
    const patient = patients[0];

    if (!patient) {
      console.warn(`Patient not found for appointment ${appointmentId}`);
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch provider name
    let providerName = '';
    if (appointment.provider_id) {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ id: appointment.provider_id });
      if (staff[0]) {
        providerName = `${staff[0].first_name} ${staff[0].last_name}`.trim();
      }
    }

    // Fetch location name
    let locationName = '';
    if (appointment.location_id) {
      const locations = await base44.asServiceRole.entities.Location.filter({ id: appointment.location_id });
      if (locations[0]) locationName = locations[0].name;
    }

    const appointmentTime = new Date(appointment.start_time);
    const formattedTime = appointmentTime.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isRescheduled = status === 'rescheduled';
    const statusLabel = isRescheduled ? 'Rescheduled' : 'Confirmed';

    let smsSent = false;
    let emailSent = false;

    // --- SMS ---
    if (patient.mobile) {
      const smsMessage = isRescheduled
        ? `Hi ${patient.first_name}, your appointment has been RESCHEDULED to ${formattedTime}${providerName ? ` with ${providerName}` : ''}${locationName ? ` at ${locationName}` : ''}. Contact us if you have questions.`
        : `Hi ${patient.first_name}, your appointment on ${formattedTime}${providerName ? ` with ${providerName}` : ''}${locationName ? ` at ${locationName}` : ''} is CONFIRMED. Please arrive 10 minutes early.`;

      try {
        const smsResp = await base44.asServiceRole.functions.invoke('sendDialogSms', {
          phone_number: patient.mobile,
          message: smsMessage,
        });
        smsSent = smsResp?.data?.success || false;
        console.log(`SMS ${smsSent ? 'sent' : 'failed'} to ${patient.mobile}`);
      } catch (e) {
        console.error('SMS error:', e.message);
      }
    }

    // --- Email ---
    if (patient.email) {
      const emailSubject = isRescheduled
        ? `Your Appointment Has Been Rescheduled`
        : `Your Appointment is Confirmed`;

      const emailBody = `Hello ${patient.first_name},

${isRescheduled
  ? `Your appointment has been rescheduled. Here are your new details:`
  : `Your appointment has been confirmed. Here are the details:`}

Date & Time: ${formattedTime}
${providerName ? `Provider: ${providerName}` : ''}
${locationName ? `Location: ${locationName}` : ''}
${appointment.reason ? `Reason: ${appointment.reason}` : ''}
${appointment.is_telehealth && appointment.telehealth_link ? `Telehealth Link: ${appointment.telehealth_link}` : ''}

${isRescheduled
  ? 'If this time does not work for you, please contact us to arrange another time.'
  : 'Please arrive 10 minutes early and bring any required documents.'}

Best regards,
${locationName || 'Healthcare Team'}`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: patient.email,
          subject: emailSubject,
          body: emailBody,
          from_name: locationName || 'Healthcare Clinic',
        });
        emailSent = true;
        console.log(`Email sent to ${patient.email}`);
      } catch (e) {
        console.error('Email error:', e.message);
      }
    }

    return Response.json({
      appointment_id: appointmentId,
      status: statusLabel,
      patient: `${patient.first_name} ${patient.last_name}`,
      sms_sent: smsSent,
      email_sent: emailSent,
    });
  } catch (error) {
    console.error('appointmentStatusNotify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});