import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { payrollPeriodId, staffId, salaryAmount, deductions, netAmount, paymentDate } = await req.json();
    if (!payrollPeriodId || !staffId || !salaryAmount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get payroll period
    const periods = await base44.entities.PayrollPeriod.filter({ id: payrollPeriodId });
    const period = periods[0];
    if (!period) return Response.json({ error: 'Payroll period not found' }, { status: 404 });

    // Create expense record
    const expense = await base44.entities.Expense.create({
      organization_id: period.organization_id,
      expense_date: new Date().toISOString(),
      category: 'staff_salary',
      description: `Salary - Payroll Period ${period.period_name || period.id.substring(0, 8)}`,
      amount: salaryAmount,
      payment_method: 'bank',
      reference_id: payrollPeriodId,
      notes: `Staff: ${staffId}, Net: Rs ${netAmount}`
    });

    // Post to GL
    await base44.functions.invoke('postExpenseToGL', {
      expenseId: expense.id,
      amount: salaryAmount,
      category: 'staff_salary',
      paymentMethod: 'bank'
    });

    console.log(`✅ Payroll expense recorded: Rs ${salaryAmount}`);
    return Response.json({ success: true, expense_id: expense.id, amount: salaryAmount });
  } catch (error) {
    console.error('Payroll expense error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});