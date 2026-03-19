import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationId, startDate, endDate } = await req.json();
    if (!organizationId) return Response.json({ error: 'Organization ID required' }, { status: 400 });

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all journal entries in period
    const journalEntries = await base44.entities.JournalEntry.filter({
      organization_id: organizationId
    });

    const filtered = journalEntries.filter(j => {
      const jDate = new Date(j.journal_date);
      return jDate >= start && jDate <= end;
    });

    // Calculate debits and credits by account
    const accountBalances = {};
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of filtered) {
      const lines = entry.lines || [];
      for (const line of lines) {
        const account = line.account_code;
        if (!accountBalances[account]) {
          accountBalances[account] = { debit: 0, credit: 0 };
        }
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        accountBalances[account].debit += debit;
        accountBalances[account].credit += credit;
        totalDebits += debit;
        totalCredits += credit;
      }
    }

    // Check if balanced (debits = credits)
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    // Get trial balance
    const trialBalance = [];
    for (const [account, balance] of Object.entries(accountBalances)) {
      const netBalance = balance.debit - balance.credit;
      trialBalance.push({
        account_code: account,
        debit: balance.debit,
        credit: balance.credit,
        net_balance: netBalance
      });
    }

    // Calculate key metrics
    const totalAssets = trialBalance
      .filter(t => t.account_code.startsWith('1'))
      .reduce((sum, t) => sum + t.debit, 0);

    const totalLiabilities = trialBalance
      .filter(t => t.account_code.startsWith('2'))
      .reduce((sum, t) => sum + t.credit, 0);

    const totalRevenue = trialBalance
      .filter(t => t.account_code.startsWith('4'))
      .reduce((sum, t) => sum + t.credit, 0);

    const totalExpenses = trialBalance
      .filter(t => t.account_code.startsWith('5') || t.account_code.startsWith('6'))
      .reduce((sum, t) => sum + t.debit, 0);

    const netIncome = totalRevenue - totalExpenses;

    console.log(`✅ Reconciliation complete: ${isBalanced ? 'BALANCED' : 'UNBALANCED'}`);
    return Response.json({
      success: true,
      start_date: startDate,
      end_date: endDate,
      is_balanced: isBalanced,
      total_debits: totalDebits,
      total_credits: totalCredits,
      balance_difference: Math.abs(totalDebits - totalCredits),
      trial_balance: trialBalance,
      summary: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_income: netIncome
      },
      entry_count: filtered.length
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});