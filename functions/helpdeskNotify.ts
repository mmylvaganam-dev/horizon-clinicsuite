import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, ticket, message, newStatus, senderName } = await req.json();

    const sendEmail = async (to, subject, body) => {
      if (!to || !to.includes('@')) return;
      await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });
    };

    const ticketUrl = `Ticket: ${ticket.ticket_number} — ${ticket.title}`;
    const base = `Ticket: ${ticket.ticket_number}\nTitle: ${ticket.title}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\nSubmitted by: ${ticket.submitter_name || ticket.submitter_email}`;

    if (event === 'ticket_created') {
      // Email submitter
      await sendEmail(
        ticket.submitter_email,
        `[Help Desk] Ticket ${ticket.ticket_number} Created`,
        `Hi ${ticket.submitter_name || 'there'},\n\nYour support ticket has been created.\n\n${base}\n\nDescription:\n${ticket.description}\n\nOur team will get back to you shortly.\n\nThank you.`
      );
      // Email assigned agent if set
      if (ticket.assigned_to) {
        await sendEmail(
          ticket.assigned_to,
          `[Help Desk] New Ticket Assigned: ${ticket.ticket_number}`,
          `A new ticket has been assigned to you.\n\n${base}\n\nDescription:\n${ticket.description}\n\nPlease log in to the Help Desk to respond.`
        );
      }
    }

    if (event === 'new_message') {
      const msgPreview = message?.message || '';
      const sender = senderName || 'Support Team';
      // Notify submitter (unless they sent it)
      if (ticket.submitter_email && message?.sender_email !== ticket.submitter_email && !message?.is_internal) {
        await sendEmail(
          ticket.submitter_email,
          `[Help Desk] New Reply on Ticket ${ticket.ticket_number}`,
          `Hi ${ticket.submitter_name || 'there'},\n\n${sender} has replied to your ticket.\n\n${ticketUrl}\n\n"${msgPreview}"\n\nLog in to view the full conversation and respond.`
        );
      }
      // Notify assigned agent (unless they sent it)
      if (ticket.assigned_to && message?.sender_email !== ticket.assigned_to && !message?.is_internal) {
        await sendEmail(
          ticket.assigned_to,
          `[Help Desk] New Reply on Ticket ${ticket.ticket_number}`,
          `A new message was added to a ticket assigned to you.\n\n${ticketUrl}\n\nFrom: ${sender}\n"${msgPreview}"\n\nLog in to the Help Desk to respond.`
        );
      }
    }

    if (event === 'status_changed') {
      const label = newStatus.replace(/_/g, ' ');
      await sendEmail(
        ticket.submitter_email,
        `[Help Desk] Ticket ${ticket.ticket_number} is now "${label}"`,
        `Hi ${ticket.submitter_name || 'there'},\n\nThe status of your support ticket has been updated.\n\n${ticketUrl}\nNew Status: ${label}\n\n${ticket.resolution_notes ? `Resolution Notes:\n${ticket.resolution_notes}\n\n` : ''}Thank you for contacting support.`
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});