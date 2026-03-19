import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationId, accountCode, asOfDate } = await req.json();
    if (!organizationId || !accountCode) {
      return Response.json({ error: 'Organization ID and account code required' }, { status: 400 });
    }

    const dateFilter = asOfDate ? new Date(asOfDate) : new Date();

    // Get all journal entries for this account
    const entries = await base44.entities.JournalEntry.filter({
      organization_id: organizationId
    });

    let balance = 0;
    const transactions = [];
    const applicableEntries = [];

    for (const entry of entries) {
      const entryDate = new Date(entry.journal_date);
      if (entryDate <= dateFilter) {
        const lines = entry.lines || [];
        for (const line of lines) {
          if (line.account_code === accountCode) {
            const debit = line.debit || 0;
            const credit = line.credit || 0;
            balance += (debit - credit);
            transactions.push({
              date: entry.journal_date,
              reference: entry.reference_number,
              description: entry.description,
              debit,
              credit,
              balance
            });
            applicableEntries.push(entry.id);
          }
        }
      }
    }

    // Get source transactions
    const sourceTransactions = [];
    if (accountCode === '1010' || accountCode === '1020') {
      // Cash/Bank accounts - get payments
      const payments = await base44.entities.Payment.filter({
        organization_id: organizationId
      });
      sourceTransactions.push(...payments.map(p => ({
        type: 'Payment',
        id: p.id,
        amount: p.amount,
        date: p.payment_date,
        reference: p.reference_number
      })));
    }

    console.log(`✅ Account audit: ${accountCode} Balance: Rs ${balance.toFixed(2)}`);
    return Response.json({
      success: true,
      account_code: accountCode,
      as_of_date: dateFilter,
      balance: balance,
      transaction_count: transactions.length,
      transactions: transactions.slice(-50), // Last 50 transactions
      source_count: sourceTransactions.length,
      verification_status: 'PENDING_REVIEW'
    });
  } catch (error) {
    console.error('Audit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});