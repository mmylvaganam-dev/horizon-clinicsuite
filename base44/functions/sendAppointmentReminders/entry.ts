import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current time and 24-hour window
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch all appointments in the 24-hour window
    const allAppointments = await base44.entities.Appointment.list();
    const appointmentsToRemind = allAppointments.filter(apt => {
      const aptStartTime = new Date(apt.start_time);
      // Check if appointment is within 24 hour window and hasn't been reminded
      return (
        aptStartTime >= now &&
        aptStartTime <= in24Hours &&
        !apt.reminder_sent_at
      );
    });

    console.log(`Found ${appointmentsToRemind.length} appointments needing reminders`);

    let smsSent = 0;
    let emailSent = 0;
    let failed = 0;

    // Process each appointment
    for (const appointment of appointmentsToRemind) {
      try {
        // Fetch patient details
        const patient = await base44.entities.Patient.list().then(patients =>
          patients.find(p => p.id === appointment.patient_id)
        );

        if (!patient) {
          console.warn(`Patient not found for appointment ${appointment.id}`);
          failed++;
          continue;
        }

        // Fetch location for context
        const location = await base44.entities.Location.list().then(locations =>
          locations.find(l => l.id === appointment.location_id)
        );

        // Fetch provider for context
        const provider = await base44.entities.StaffProfile.list().then(staff =>
          staff.find(s => s.id === appointment.provider_id)
        );

        const appointmentTime = new Date(appointment.start_time);
        const formattedTime = appointmentTime.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Send SMS reminder if patient has mobile number
        if (patient.mobile) {
          try {
            const smsMessage = `Reminder: You have an appointment on ${formattedTime}${
              provider ? ` with ${provider.full_name || provider.first_name}` : ''
            }${location ? ` at ${location.name}` : ''}. Please arrive on time.`;

            // Use Dialog eSMS via backend function
            const smsResponse = await base44.functions.invoke('sendDialogSms', {
              phone_number: patient.mobile,
              message: smsMessage,
            });

            if (smsResponse.data.success) {
              smsSent++;
              // Mark reminder as sent
              await base44.entities.Appointment.update(appointment.id, {
                reminder_sent_at: new Date().toISOString(),
                reminder_method: 'sms',
              });
              console.log(`SMS sent to ${patient.mobile} for appointment ${appointment.id}`);
            } else {
              failed++;
              console.error(`Failed to send SMS for appointment ${appointment.id}`);
            }
          } catch (smsError) {
            console.error(`SMS error for appointment ${appointment.id}:`, smsError);
            failed++;
          }
        }

        // Send email reminder if patient has email
        if (patient.email) {
          try {
            const emailBody = `
Hello ${patient.first_name},

This is a reminder about your upcoming appointment:

Date & Time: ${formattedTime}
${provider ? `Provider: ${provider.full_name || provider.first_name}` : ''}
${location ? `Location: ${location.name}` : ''}
${appointment.reason ? `Reason: ${appointment.reason}` : ''}

Please arrive 10 minutes early and bring any required documents.

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
${location?.name || 'Healthcare Team'}
            `;

            const emailResponse = await base44.integrations.Core.SendEmail({
              to: patient.email,
              subject: `Appointment Reminder - ${formattedTime}`,
              body: emailBody,
              from_name: location?.name || 'Healthcare Clinic',
            });

            emailSent++;
            console.log(`Email sent to ${patient.email} for appointment ${appointment.id}`);
          } catch (emailError) {
            console.error(`Email error for appointment ${appointment.id}:`, emailError);
          }
        }

        // If neither SMS nor email was sent, mark as failed
        if (!patient.mobile && !patient.email) {
          console.warn(`No contact info for patient ${patient.id}`);
          failed++;
        }
      } catch (error) {
        console.error(`Error processing appointment ${appointment.id}:`, error);
        failed++;
      }
    }

    const summary = {
      total_appointments: appointmentsToRemind.length,
      sms_sent: smsSent,
      email_sent: emailSent,
      failed: failed,
      timestamp: new Date().toISOString(),
    };

    console.log('Reminder summary:', summary);
    return Response.json(summary);
  } catch (error) {
    console.error('Error in sendAppointmentReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});