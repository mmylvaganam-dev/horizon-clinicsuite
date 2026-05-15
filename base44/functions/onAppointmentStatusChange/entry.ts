import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Only act on updates where status changed to confirmed or rescheduled
    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    if (!['confirmed', 'rescheduled'].includes(newStatus) || newStatus === oldStatus) {
      return Response.json({ skipped: true, reason: 'Status not changed to target value' });
    }

    // Fetch the full appointment record to get patient contact info
    const appointmentId = event?.entity_id || data?.id;
    let appointment = data;

    if (!appointment?.patient_email && !appointment?.patient_id) {
      return Response.json({ skipped: true, reason: 'No patient contact info available' });
    }

    // Get patient details if we need email
    let patientEmail = appointment.patient_email;
    let patientName = appointment.patient_name || 'Patient';

    if (!patientEmail && appointment.patient_id) {
      try {
        const patient = await base44.asServiceRole.entities.Patient.filter({ id: appointment.patient_id });
        if (patient?.[0]?.email) patientEmail = patient[0].email;
        if (patient?.[0]?.first_name) patientName = `${patient[0].first_name} ${patient[0].last_name || ''}`.trim();
      } catch (_) {}
    }

    if (!patientEmail) {
      return Response.json({ skipped: true, reason: 'No patient email found' });
    }

    // Format appointment time
    const scheduledTime = appointment.scheduled_time || appointment.appointment_date;
    let formattedTime = 'your scheduled time';
    if (scheduledTime) {
      try {
        formattedTime = new Date(scheduledTime).toLocaleString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo'
        });
      } catch (_) {}
    }

    const providerName = appointment.provider_name || appointment.doctor_name || '';
    const locationName = appointment.location_name || '';

    let subject, body;

    if (newStatus === 'confirmed') {
      subject = 'Your Appointment is Confirmed ✅';
      body = `Dear ${patientName},

Your appointment has been confirmed.

📅 Date & Time: ${formattedTime}
${providerName ? `👨‍⚕️ Provider: ${providerName}\n` : ''}${locationName ? `📍 Location: ${locationName}\n` : ''}
Please arrive 10–15 minutes before your scheduled time. If you need to reschedule or cancel, please contact us as soon as possible.

Thank you,
The Clinic Team`;
    } else {
      subject = 'Your Appointment Has Been Rescheduled 🔄';
      body = `Dear ${patientName},

Your appointment has been rescheduled.

📅 New Date & Time: ${formattedTime}
${providerName ? `👨‍⚕️ Provider: ${providerName}\n` : ''}${locationName ? `📍 Location: ${locationName}\n` : ''}
If this new time does not work for you, please contact us and we will find a suitable alternative.

Thank you for your understanding,
The Clinic Team`;
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: patientEmail,
      subject,
      body,
    });

    console.log(`Reminder sent to ${patientEmail} for status: ${newStatus}`);
    return Response.json({ success: true, sentTo: patientEmail, status: newStatus });

  } catch (error) {
    console.error('onAppointmentStatusChange error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});