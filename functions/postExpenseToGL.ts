import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { expenseId, amount, category, paymentMethod } = await req.json();
    if (!expenseId || !amount || !category) {
      return Response.json({ error: 'Expense ID, amount, and category required' }, { status: 400 });
    }

    const expenses = await base44.entities.Expense.filter({ id: expenseId });
    const expense = expenses[0];
    if (!expense) return Response.json({ error: 'Expense not found' }, { status: 404 });

    // Map expense categories to GL accounts
    const expenseAccounts = {
      staff_salary: '6100',
      utilities: '6200',
      rent: '6300',
      maintenance: '6400',
      supplies: '6500',
      transportation: '6600',
      other: '6900'
    };

    const paymentAccounts = {
      cash: '1010',
      bank: '1020',
      card: '1030'
    };

    const expenseAccount = expenseAccounts[category] || expenseAccounts.other;
    const paymentAccount = paymentAccounts[paymentMethod] || paymentAccounts.cash;

    // Entry: Debit Expense, Credit Payment Account
    const entry = await base44.entities.JournalEntry.create({
      organization_id: expense.organization_id,
      journal_date: expense.expense_date || new Date().toISOString(),
      transaction_type: 'expense',
      reference_id: expenseId,
      reference_number: `EXP-${expenseId.substring(0, 8)}`,
      description: `${category.toUpperCase()} - Rs ${amount.toFixed(2)}`,
      lines: [
        { account_code: expenseAccount, debit: amount, credit: 0 },
        { account_code: paymentAccount, debit: 0, credit: amount }
      ]
    });

    console.log(`✅ Expense GL posted: ${expenseId} - Rs ${amount} (${category})`);
    return Response.json({ success: true, entry_id: entry.id, amount, category });
  } catch (error) {
    console.error('Expense GL error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});