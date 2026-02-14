import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Calculator, AlertCircle, CheckCircle, Calendar
} from 'lucide-react';
import { useOrganization } from '@/components/OrganizationProvider';

export default function FinancialDashboard() {
  const { selectedOrgId } = useOrganization();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: financials, isLoading } = useQuery({
    queryKey: ['financialStatements', selectedOrgId, dateRange],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      const result = await base44.functions.invoke('generateFinancialStatements', {
        organizationId: selectedOrgId,
        startDate: `${dateRange.start}T00:00:00Z`,
        endDate: `${dateRange.end}T23:59:59Z`
      });
      return result.data;
    },
    enabled: !!selectedOrgId
  });

  const { data: reconciliation } = useQuery({
    queryKey: ['reconciliation', selectedOrgId, dateRange],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      const result = await base44.functions.invoke('financialReconciliation', {
        organizationId: selectedOrgId,
        startDate: `${dateRange.start}T00:00:00Z`,
        endDate: `${dateRange.end}T23:59:59Z`
      });
      return result.data;
    },
    enabled: !!selectedOrgId
  });

  if (!selectedOrgId) {
    return <div className="text-center text-slate-600 p-8">Please select an organization</div>;
  }

  if (isLoading) {
    return <div className="text-center text-slate-600 p-8">Loading financial data...</div>;
  }

  const stats = financials?.income_statement || {};
  const balance = financials?.balance_sheet || {};

  const chartData = [
    { name: 'Revenue', value: stats.revenue?.sales_revenue || 0 },
    { name: 'COGS', value: stats.costs?.total_cogs || 0 },
    { name: 'Expenses', value: stats.expenses?.operating_expenses || 0 }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Financial Dashboard</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <span className="px-3 py-2">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Rs {(stats.revenue?.sales_revenue || 0).toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Rs {(stats.gross_profit || 0).toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">Margin: {stats.revenue?.sales_revenue > 0 ? ((stats.gross_profit / stats.revenue.sales_revenue) * 100).toFixed(1) : 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs {(stats.net_income || 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-600 mt-1">After all expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">GL Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {reconciliation?.is_balanced ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-semibold">{reconciliation?.is_balanced ? 'Balanced' : 'Variance'}</span>
            </div>
            {!reconciliation?.is_balanced && (
              <p className="text-xs text-red-600 mt-1">Diff: Rs {(reconciliation?.balance_difference || 0).toFixed(2)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income Statement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Assets</span>
              <span className="font-semibold">Rs {(balance.assets?.current_assets || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fixed Assets</span>
              <span className="font-semibold">Rs {(balance.assets?.fixed_assets || 0).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total Assets</span>
              <span>Rs {(balance.assets?.total_assets || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Liabilities</span>
              <span className="font-semibold">Rs {(balance.liabilities?.current_liabilities || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Long-term Liabilities</span>
              <span className="font-semibold">Rs {(balance.liabilities?.long_term_liabilities || 0).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total Liabilities</span>
              <span>Rs {(balance.liabilities?.total_liabilities || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Retained Earnings</span>
              <span className="font-semibold">Rs {(balance.equity?.retained_earnings || 0).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total Equity</span>
              <span>Rs {(balance.equity?.total_equity || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trial Balance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            General Ledger Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Total Debits</p>
              <p className="text-xl font-bold">Rs {(reconciliation?.total_debits || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Credits</p>
              <p className="text-xl font-bold">Rs {(reconciliation?.total_credits || 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm"><strong>Status:</strong> {reconciliation?.is_balanced ? '✓ Balanced' : '⚠ Variance Pending'}</p>
            {!reconciliation?.is_balanced && (
              <p className="text-sm text-red-600">Difference: Rs {(reconciliation?.balance_difference || 0).toFixed(2)}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}