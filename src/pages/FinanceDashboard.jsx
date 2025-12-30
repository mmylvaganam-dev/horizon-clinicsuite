import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function FinanceDashboard() {
  const navigate = useNavigate();
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['bankBalances'],
    queryFn: () => base44.entities.BankBalanceLog.list('-as_of_date'),
  });

  const { data: payrollPeriods = [] } = useQuery({
    queryKey: ['payrollPeriods'],
    queryFn: () => base44.entities.PayrollPeriod.list('-period_end'),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-expense_date'),
  });

  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.RevenueEntry.list('-revenue_date'),
  });

  // Get latest balance per company
  const latestBalances = {};
  balances.forEach(b => {
    if (!latestBalances[b.company_ref] || new Date(b.as_of_date) > new Date(latestBalances[b.company_ref].as_of_date)) {
      latestBalances[b.company_ref] = b;
    }
  });

  // Current month calculations
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const mtdRevenue = revenues.filter(r => r.revenue_date?.startsWith(currentMonth)).reduce((sum, r) => sum + (r.amount || 0), 0);
  const mtdExpenses = expenses.filter(e => e.expense_date?.startsWith(currentMonth)).reduce((sum, e) => sum + (e.amount || 0), 0);

  const unapprovedPayroll = payrollPeriods.filter(p => p.status === 'draft').length;
  const lowBalanceAccounts = Object.values(latestBalances).filter(b => b.balance < 10000).length;

  const getCompanyName = (companyRef) => {
    const company = companies.find(c => c.id === companyRef);
    return company?.company_trade_name || company?.company_legal_name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Finance Control Tower</h1>
          <p className="text-slate-500 mt-1">Multi-company financial overview</p>
        </div>
        <Button variant="outline" onClick={() => navigate(createPageUrl('Billing'))}>
          ← Open Billing
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Companies</p>
                <p className="text-2xl font-bold">{companies.filter(c => c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">MTD Revenue</p>
                <p className="text-2xl font-bold">${mtdRevenue.toLocaleString()}</p>
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
                <p className="text-sm text-slate-500">MTD Expenses</p>
                <p className="text-2xl font-bold">${mtdExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Alerts</p>
                <p className="text-2xl font-bold">{unapprovedPayroll + lowBalanceAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(unapprovedPayroll > 0 || lowBalanceAccounts > 0) && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unapprovedPayroll > 0 && (
              <p className="text-sm text-amber-800">• {unapprovedPayroll} payroll period(s) awaiting approval</p>
            )}
            {lowBalanceAccounts > 0 && (
              <p className="text-sm text-amber-800">• {lowBalanceAccounts} account(s) with low balance (&lt;$10,000)</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bank Balances by Company</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : Object.entries(latestBalances).length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No bank balances logged yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(latestBalances).map(([companyRef, balance]) => (
                <div key={companyRef} className="flex items-center justify-between p-4 rounded-lg border bg-white">
                  <div>
                    <p className="font-semibold text-slate-900">{getCompanyName(companyRef)}</p>
                    <p className="text-xs text-slate-500">As of {format(new Date(balance.as_of_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${balance.balance < 10000 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ${balance.balance.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="mt-1">{balance.source}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payroll Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {payrollPeriods.slice(0, 5).map((period) => (
              <div key={period.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{format(new Date(period.period_start), 'MMM d')} - {format(new Date(period.period_end), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-slate-500">{getCompanyName(period.company_ref)}</p>
                </div>
                <Badge className={
                  period.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                  period.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }>
                  {period.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{expense.vendor_name}</p>
                  <p className="text-xs text-slate-500">{expense.category} • {format(new Date(expense.expense_date), 'MMM d, yyyy')}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">${expense.amount.toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}