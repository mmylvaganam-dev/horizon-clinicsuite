import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationId, accountCode, bankStatement, reconciliationDate } = await req.json();
    if (!organizationId || !accountCode) {
      return Response.json({ error: 'Organization ID and account code required' }, { status: 400 });
    }

    // Get all payments against this account
    const payments = await base44.entities.Payment.filter({
      organization_id: organizationId
    });

    let systemBalance = 0;
    const appliedPayments = [];

    // Calculate system balance from payments
    for (const payment of payments) {
      const paymentDate = new Date(payment.payment_date);
      if (new Date(reconciliationDate) >= paymentDate) {
        systemBalance += payment.amount || 0;
        appliedPayments.push({
          id: payment.id,
          reference: payment.reference_number,
          amount: payment.amount,
          date: payment.payment_date
        });
      }
    }

    // Bank statement balance
    const bankBalance = bankStatement?.balance || 0;
    const variance = Math.abs(systemBalance - bankBalance);
    const isReconciled = variance < 0.01; // Allow for rounding errors

    return Response.json({
      success: true,
      system_balance: systemBalance,
      bank_balance: bankBalance,
      variance: variance,
      is_reconciled: isReconciled,
      reconciliation_date: reconciliationDate,
      payment_count: appliedPayments.length,
      payments: appliedPayments,
      status: isReconciled ? 'RECONCILED' : 'VARIANCE_PENDING'
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});