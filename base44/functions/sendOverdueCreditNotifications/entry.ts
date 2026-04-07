import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all organizations
    const organizations = await base44.asServiceRole.entities.Organization.list();

    for (const org of organizations) {
      // Fetch all credit sales for this organization
      const creditSales = await base44.asServiceRole.entities.CreditSale.filter({
        organization_id: org.id,
        payment_status: { $ne: 'paid' }
      });

      // Group by institution and check for overdue invoices
      const institutionMap = {};
      for (const sale of creditSales) {
        if (!institutionMap[sale.institution_id]) {
          institutionMap[sale.institution_id] = [];
        }
        institutionMap[sale.institution_id].push(sale);
      }

      // Process each institution
      for (const [institutionId, sales] of Object.entries(institutionMap)) {
        // Fetch institution details
        const institutions = await base44.asServiceRole.entities.Institution.filter({
          id: institutionId
        });

        if (!institutions[0]) continue;

        const institution = institutions[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check for overdue invoices
        const overdueSales = sales.filter(sale => {
          const saleDate = new Date(sale.sale_date);
          const dueDate = calculateDueDate(saleDate, institution.payment_terms);
          return dueDate < today;
        });

        // If there are overdue invoices, send email
        if (overdueSales.length > 0 && institution.contact_email) {
          await sendOverdueNotification(base44, institution, overdueSales);
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Overdue credit notifications processed'
    });
  } catch (error) {
    console.error('Error in sendOverdueCreditNotifications:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

function calculateDueDate(saleDate, paymentTerms) {
  const daysToAdd = {
    'net_30': 30,
    'net_60': 60,
    'net_90': 90,
    'cash': 0
  };

  const days = daysToAdd[paymentTerms] || 30;
  const dueDate = new Date(saleDate);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

async function sendOverdueNotification(base44, institution, overdueSales) {
  const totalAmount = overdueSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const daysOverdue = overdueSales.map(sale => {
    const dueDate = calculateDueDate(new Date(sale.sale_date), institution.payment_terms);
    const today = new Date();
    return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  });
  const maxDaysOverdue = Math.max(...daysOverdue);

  const invoiceList = overdueSales
    .map(sale => `- PO ${sale.po_number || 'N/A'}: $${sale.total_amount.toFixed(2)} (${daysOverdue[overdueSales.indexOf(sale)]} days overdue)`)
    .join('\n');

  const emailBody = `
Dear ${institution.contact_person || 'Contact'},

This is a friendly reminder that your institution has ${overdueSales.length} outstanding invoice(s) that are now overdue for payment.

OVERDUE INVOICES:
${invoiceList}

Total Outstanding Amount: $${totalAmount.toFixed(2)}
Most Overdue: ${maxDaysOverdue} days

Please arrange payment at your earliest convenience. You can view and manage your payments through your institution portal.

Payment Terms: ${institution.payment_terms.replace('_', ' ').toUpperCase()}
Credit Limit: $${institution.credit_limit.toFixed(2)}

If you have any questions or need assistance, please contact our accounts team.

Thank you,
Pharmacy Accounts Team
`;

  await base44.integrations.Core.SendEmail({
    to: institution.contact_email,
    subject: `Payment Reminder: ${overdueSales.length} Overdue Invoice(s) - ${institution.name}`,
    body: emailBody,
    from_name: 'Pharmacy Accounts'
  });

  console.log(`Sent overdue notification to ${institution.name} (${institution.contact_email})`);
}