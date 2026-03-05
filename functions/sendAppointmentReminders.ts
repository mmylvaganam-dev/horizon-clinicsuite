import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DIALOG_LOGIN_URL = 'https://e-sms.dialog.lk/api/v2/user/login';
const DIALOG_SEND_URL = 'https://e-sms.dialog.lk/api/v2/sms';

async function getDialogToken(username, password) {
  const res = await fetch(DIALOG_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Dialog login failed: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('No token from Dialog eSMS');
  return data.token;
}

async function sendSms(token, mobile, message) {
  const cleaned = mobile.replace(/\s+/g, '');
  if (!/^7\d{8}$/.test(cleaned)) return; // skip invalid SL numbers
  await fetch(DIALOG_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      msisdn: [{ mobile: cleaned }],
      message,
      transaction_id: Date.now(),
    }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // This runs as a scheduled task — use service role
    const payload = await req.json().catch(() => ({}));
    const windowHours = payload.windowHours ?? 24; // 24 or 1

    const now = new Date();
    // Target window: appointments whose start_time is within [windowHours - 5min, windowHours + 5min] from now
    const windowStart = new Date(now.getTime() + (windowHours * 60 - 5) * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + (windowHours * 60 + 5) * 60 * 1000);

    // Fetch upcoming appointments in that window
    const allAppointments = await base44.asServiceRole.entities.Appointment.list('-start_time', 500);
    const due = allAppointments.filter(a => {
      if (['cancelled', 'completed', 'no-show'].includes(a.status)) return false;
      const t = new Date(a.start_time);
      return t >= windowStart && t <= windowEnd;
    });

    console.log(`[Reminders] windowHours=${windowHours}, due=${due.length}`);

    if (due.length === 0) return Response.json({ sent: 0 });

    // Load patients (unique ids)
    const patientIds = [...new Set(due.map(a => a.patient_id))];
    const patients = {};
    await Promise.all(patientIds.map(async (pid) => {
      const results = await base44.asServiceRole.entities.Patient.filter({ id: pid });
      if (results[0]) patients[pid] = results[0];
    }));

    // Load orgs (for SMS credentials)
    const orgIds = [...new Set(due.map(a => a.organization_id).filter(Boolean))];
    const orgSmsTokens = {};
    await Promise.all(orgIds.map(async (orgId) => {
      const companies = await base44.asServiceRole.entities.CompanyProfile.filter({ organization_id: orgId });
      const co = companies[0];
      if (co?.esms_username && co?.esms_password) {
        try {
          orgSmsTokens[orgId] = await getDialogToken(co.esms_username, co.esms_password);
        } catch (e) {
          console.warn(`SMS token failed for org ${orgId}:`, e.message);
        }
      }
    }));

    let sent = 0;

    for (const appt of due) {
      const patient = patients[appt.patient_id];
      if (!patient) continue;

      const apptTime = new Date(appt.start_time).toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });

      const label = windowHours === 24 ? 'tomorrow' : 'in 1 hour';
      const reminderMsg = `Reminder: Your appointment is scheduled ${label} on ${apptTime}. Please arrive on time. If you need to cancel, contact us immediately.`;

      // --- Email ---
      const email = patient.email;
      if (email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `Appointment Reminder — ${apptTime}`,
            body: `<p>Dear ${patient.first_name || 'Patient'},</p>
<p>This is a reminder that you have an appointment scheduled <strong>${label}</strong>:</p>
<ul>
  <li><strong>Date & Time:</strong> ${apptTime}</li>
  <li><strong>Type:</strong> ${appt.type || 'Consultation'}</li>
  ${appt.reason ? `<li><strong>Reason:</strong> ${appt.reason}</li>` : ''}
</ul>
<p>Please arrive 10 minutes early. If you need to reschedule or cancel, please contact us as soon as possible.</p>
<p>Thank you.</p>`,
          });
          sent++;
        } catch (e) {
          console.warn(`Email failed for patient ${patient.id}:`, e.message);
        }
      }

      // --- SMS ---
      const mobile = patient.mobile || patient.phone;
      const smsToken = orgSmsTokens[appt.organization_id];
      if (mobile && smsToken) {
        try {
          await sendSms(smsToken, mobile, reminderMsg);
          sent++;
        } catch (e) {
          console.warn(`SMS failed for patient ${patient.id}:`, e.message);
        }
      }
    }

    console.log(`[Reminders] Sent ${sent} notifications for ${due.length} appointments`);
    return Response.json({ sent, appointments: due.length });
  } catch (error) {
    console.error('[Reminders] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});