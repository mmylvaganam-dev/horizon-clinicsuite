import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const pendingInvitations = await base44.asServiceRole.entities.PendingInvitation.filter({ status: 'pending' });

  const stale = pendingInvitations.filter(inv => {
    const created = new Date(inv.created_date);
    return created <= threeDaysAgo;
  });

  let sent = 0;
  for (const inv of stale) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: inv.email,
      subject: "You're invited — don't miss out!",
      body: `
        <p>Hi there,</p>
        <p>We noticed you haven't joined <strong>${inv.organization_name || 'Anantham Health Centre'}</strong> on the Horizon ClinicSuite platform yet.</p>
        <p>Your invitation is still active! Please check your inbox for the original invite email and click the link to complete your registration.</p>
        <p>If you need a new invite link or have any questions, please contact your administrator at <a href="mailto:${inv.invited_by}">${inv.invited_by}</a>.</p>
        <br/>
        <p>The Horizon ClinicSuite Team</p>
      `
    });
    sent++;
  }

  return Response.json({ checked: pendingInvitations.length, stale: stale.length, emails_sent: sent });
});