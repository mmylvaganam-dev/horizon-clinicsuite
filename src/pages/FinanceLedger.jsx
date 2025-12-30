import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function FinanceLedger() {
  const queryClient = useQueryClient();
  const [showExpense, setShowExpense] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'supplies',
    vendor_name: '',
    payee_type: '',
    payee_ref_id: '',
    payee_name_cache: '',
    description: '',
    amount: '',
    payment_method: 'transfer',
    cheque_number: ''
  });
  const [depositForm, setDepositForm] = useState({
    deposit_date: format(new Date(), 'yyyy-MM-dd'),
    bank_account_ref: '',
    amount: '',
    method: 'cash',
    reference: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.ExpenseEntry.list('-expense_date', 50),
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['deposits'],
    queryFn: () => base44.entities.DepositLog.list('-deposit_date', 50),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => base44.entities.BankAccount.filter({ status: 'active' }),
  });

  const { data: payees = [] } = useQuery({
    queryKey: ['payees', expenseForm.payee_type],
    queryFn: async () => {
      if (!expenseForm.payee_type) return [];
      return await base44.entities.PayeeDirectory.filter({ 
        payee_type: expenseForm.payee_type,
        status: 'active'
      });
    },
    enabled: !!expenseForm.payee_type,
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.ExpenseEntry.create({
      organization_id: user.organization_id || '',
      ...data,
      created_by: user.id,
      created_by_email: user.email
    }),
    onSuccess: () => {
      toast.success('Expense recorded');
      queryClient.invalidateQueries(['expenses']);
      setShowExpense(false);
      setExpenseForm({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'supplies',
        vendor_name: '',
        payee_type: '',
        payee_ref_id: '',
        payee_name_cache: '',
        description: '',
        amount: '',
        payment_method: 'transfer',
        cheque_number: ''
      });
    },
  });

  const createDepositMutation = useMutation({
    mutationFn: (data) => base44.entities.DepositLog.create({
      organization_id: user.organization_id || '',
      ...data,
      created_by: user.id,
      created_by_email: user.email
    }),
    onSuccess: () => {
      toast.success('Deposit logged');
      queryClient.invalidateQueries(['deposits']);
      setShowDeposit(false);
      setDepositForm({
        deposit_date: format(new Date(), 'yyyy-MM-dd'),
        bank_account_ref: '',
        amount: '',
        method: 'cash',
        reference: ''
      });
    },
  });

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (expenseForm.payment_method === 'cheque' && !expenseForm.cheque_number) {
      toast.error('Cheque number required');
      return;
    }
    const requiresPayee = ['salary', 'payroll', 'physician_payment', 'contractor_payment'].includes(expenseForm.category);
    if (requiresPayee && !expenseForm.payee_ref_id && expenseForm.payee_type !== 'OTHER') {
      toast.error('Please select a payee for this expense category');
      return;
    }
    createExpenseMutation.mutate({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
      currency: 'USD',
      payee_type: expenseForm.payee_type || 'OTHER',
      payee_name_cache: expenseForm.payee_name_cache || expenseForm.vendor_name
    });
  };

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    createDepositMutation.mutate({
      ...depositForm,
      amount: parseFloat(depositForm.amount)
    });
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Finance Ledger</h1>
        <p className="text-slate-500 mt-1">Income, expenses, and banking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Deposits</p>
                <p className="text-2xl font-bold">${totalDeposits.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Expenses</p>
                <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Net</p>
                <p className={`text-2xl font-bold ${totalDeposits - totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${(totalDeposits - totalExpenses).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowExpense(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Record Expense
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {expenses.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No expenses recorded</p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{expense.description}</p>
                        <p className="text-sm text-slate-500">
                          {expense.vendor_name && `${expense.vendor_name} • `}
                          {expense.category} • {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                          {expense.payment_method === 'cheque' && expense.cheque_number && ` • Cheque #${expense.cheque_number}`}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-rose-600">-${expense.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowDeposit(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Log Deposit
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {deposits.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No deposits logged</p>
              ) : (
                <div className="space-y-2">
                  {deposits.map((deposit) => (
                    <div key={deposit.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">
                          {bankAccounts.find(b => b.id === deposit.bank_account_ref)?.account_nickname || 'Bank Deposit'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {deposit.method} • {format(new Date(deposit.deposit_date), 'MMM d, yyyy')}
                          {deposit.reference && ` • Ref: ${deposit.reference}`}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">+${deposit.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showExpense} onOpenChange={setShowExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={expenseForm.category} onValueChange={(v) => {
                const newForm = { ...expenseForm, category: v };
                if (v === 'salary' || v === 'payroll') newForm.payee_type = 'STAFF';
                else if (v === 'physician_payment' || v === 'contractor_payment') newForm.payee_type = 'THIRDPARTY';
                setExpenseForm(newForm);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="physician_payment">Physician Payment</SelectItem>
                  <SelectItem value="contractor_payment">Contractor Payment</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Payee Type</label>
              <Select value={expenseForm.payee_type} onValueChange={(v) => setExpenseForm({ ...expenseForm, payee_type: v, payee_ref_id: '', payee_name_cache: '' })}>
                <SelectTrigger><SelectValue placeholder="Select payee type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="VENDOR">Vendor</SelectItem>
                  <SelectItem value="THIRDPARTY">Third-Party Provider</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {expenseForm.payee_type && expenseForm.payee_type !== 'OTHER' && (
              <div>
                <label className="text-sm font-medium">Payee</label>
                <Select value={expenseForm.payee_ref_id} onValueChange={(v) => {
                  const selectedPayee = payees.find(p => p.id === v);
                  setExpenseForm({ 
                    ...expenseForm, 
                    payee_ref_id: v, 
                    payee_name_cache: selectedPayee?.display_name || '',
                    vendor_name: selectedPayee?.display_name || ''
                  });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select payee" /></SelectTrigger>
                  <SelectContent>
                    {payees.map(payee => (
                      <SelectItem key={payee.id} value={payee.id}>
                        {payee.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {expenseForm.payee_type === 'OTHER' && (
              <div>
                <label className="text-sm font-medium">Payee Name</label>
                <Input
                  value={expenseForm.vendor_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value, payee_name_cache: e.target.value })}
                  placeholder="Enter payee name"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Amount *</label>
              <Input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Payment Method *</label>
              <Select value={expenseForm.payment_method} onValueChange={(v) => setExpenseForm({...expenseForm, payment_method: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {expenseForm.payment_method === 'cheque' && (
              <div>
                <label className="text-sm font-medium">Cheque Number *</label>
                <Input
                  value={expenseForm.cheque_number}
                  onChange={(e) => setExpenseForm({...expenseForm, cheque_number: e.target.value})}
                  required
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowExpense(false)}>Cancel</Button>
              <Button type="submit" disabled={createExpenseMutation.isPending}>Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Deposit</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleDepositSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={depositForm.deposit_date}
                onChange={(e) => setDepositForm({...depositForm, deposit_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Bank Account *</label>
              <Select value={depositForm.bank_account_ref} onValueChange={(v) => setDepositForm({...depositForm, bank_account_ref: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_nickname} - {account.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Amount *</label>
              <Input
                type="number"
                step="0.01"
                value={depositForm.amount}
                onChange={(e) => setDepositForm({...depositForm, amount: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Method *</label>
              <Select value={depositForm.method} onValueChange={(v) => setDepositForm({...depositForm, method: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Reference</label>
              <Input
                value={depositForm.reference}
                onChange={(e) => setDepositForm({...depositForm, reference: e.target.value})}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDeposit(false)}>Cancel</Button>
              <Button type="submit" disabled={createDepositMutation.isPending}>Log</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}