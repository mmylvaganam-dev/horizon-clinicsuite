import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, DollarSign, Building2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useOrganization } from '@/components/OrganizationProvider';
import CreditSaleInvoiceButton from '@/components/credit/CreditSaleInvoiceButton';

export default function CreditUsageDashboard() {
  const { selectedOrgId } = useOrganization();

  // Fetch institutions for selected org
  const { data: institutions = [], isLoading: loadingInstitutions } = useQuery({
    queryKey: ['institutionsForOrg', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const insts = await base44.entities.Institution.filter({ organization_id: selectedOrgId });
      return insts;
    },
    enabled: !!selectedOrgId,
  });

  // Fetch all credit sales for selected org
  const { data: creditSales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['creditSalesForOrg', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const sales = await base44.entities.CreditSale.filter({ organization_id: selectedOrgId });
      return sales;
    },
    enabled: !!selectedOrgId,
  });

  // Calculate institution credit usage and overdue info
  const institutionMetrics = useMemo(() => {
    return institutions.map(inst => {
      const instSales = creditSales.filter(s => s.institution_id === inst.id);
      const outstandingAmount = instSales
        .filter(s => s.payment_status !== 'paid')
        .reduce((sum, s) => sum + s.total_amount, 0);

      const utilizationPct = inst.credit_limit > 0 
        ? (outstandingAmount / inst.credit_limit) * 100 
        : 0;

      // Find overdue invoices
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdueInvoices = instSales.filter(sale => {
        if (sale.payment_status === 'paid') return false;
        const saleDate = new Date(sale.sale_date);
        const daysToAdd = {
          'net_30': 30, 'net_60': 60, 'net_90': 90, 'cash': 0
        }[inst.payment_terms] || 30;
        const dueDate = new Date(saleDate);
        dueDate.setDate(dueDate.getDate() + daysToAdd);
        return dueDate < today;
      });

      return {
        ...inst,
        outstandingAmount,
        utilizationPct,
        overdueCount: overdueInvoices.length,
        overdueSales: overdueInvoices,
        riskLevel: utilizationPct >= 90 ? 'critical' : utilizationPct >= 70 ? 'high' : 'normal'
      };
    });
  }, [institutions, creditSales]);

  // Prepare trend chart data (last 30 days)
  const trendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, 'MMM dd'),
        fullDate: date.toISOString().split('T')[0],
      };
    });

    return last30Days.map(day => {
      const daysSales = creditSales.filter(s => s.sale_date.split('T')[0] === day.fullDate);
      return {
        date: day.date,
        newSales: daysSales.length,
        totalAmount: daysSales.reduce((sum, s) => sum + s.total_amount, 0)
      };
    });
  }, [creditSales]);

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const totalOutstanding = institutionMetrics.reduce((sum, i) => sum + i.outstandingAmount, 0);
    const totalCreditLimit = institutionMetrics.reduce((sum, i) => sum + i.credit_limit, 0);
    const overdueInstitutions = institutionMetrics.filter(i => i.overdueCount > 0);
    const criticalInstitutions = institutionMetrics.filter(i => i.riskLevel === 'critical');

    return {
      totalOutstanding,
      totalCreditLimit,
      overallUtilization: totalCreditLimit > 0 ? (totalOutstanding / totalCreditLimit) * 100 : 0,
      overdueInstitutions,
      criticalInstitutions
    };
  }, [institutionMetrics]);

  const isLoading = loadingInstitutions || loadingSales;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Credit Usage Dashboard</h1>
          <p className="text-slate-600">Monitor institution credit usage, trends, and payment status</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full" />
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold text-slate-900">
                      Rs. {aggregateMetrics.totalOutstanding.toFixed(0)}
                    </div>
                    <DollarSign className="w-5 h-5 text-teal-600 mb-1" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Across all institutions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Overall Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {aggregateMetrics.overallUtilization.toFixed(0)}%
                    </div>
                    <TrendingUp className="w-5 h-5 text-blue-600 mb-1" />
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                    <div 
                      className={`h-2 rounded-full ${
                        aggregateMetrics.overallUtilization >= 90 ? 'bg-red-600' :
                        aggregateMetrics.overallUtilization >= 70 ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(aggregateMetrics.overallUtilization, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Overdue Institutions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold text-red-600">
                      {aggregateMetrics.overdueInstitutions.length}
                    </div>
                    <AlertCircle className="w-5 h-5 text-red-600 mb-1" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Need payment follow-up</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Critical Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold text-orange-600">
                      {aggregateMetrics.criticalInstitutions.length}
                    </div>
                    <Building2 className="w-5 h-5 text-orange-600 mb-1" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">At or exceeding limits</p>
                </CardContent>
              </Card>
            </div>

            {/* Overdue Alerts */}
            {aggregateMetrics.overdueInstitutions.length > 0 && (
              <Card className="mb-8 bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertCircle className="w-5 h-5" />
                    Overdue Payment Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aggregateMetrics.overdueInstitutions.map(inst => (
                      <div key={inst.id} className="bg-white p-3 rounded border border-red-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{inst.name}</p>
                          <p className="text-xs text-slate-600">{inst.contact_email}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700">
                          {inst.overdueCount} overdue
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Outstanding: Rs. {inst.outstandingAmount.toFixed(2)}</span>
                        <span className="text-red-600 font-semibold">
                          {inst.overdueSales.length} invoices past due
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {inst.overdueSales.map(sale => (
                          <CreditSaleInvoiceButton key={sale.id} creditSale={sale} variant="ghost" />
                        ))}
                      </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trends Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Credit Sales Trend (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="newSales" stroke="#3b82f6" name="New Invoices" />
                    <Line yAxisId="right" type="monotone" dataKey="totalAmount" stroke="#10b981" name="Amount (LKR)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Credit Utilization Heatmap */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Institution Credit Utilization Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {institutionMetrics
                    .sort((a, b) => b.utilizationPct - a.utilizationPct)
                    .map(inst => {
                      const bgColor = 
                        inst.riskLevel === 'critical' ? 'bg-red-100 border-red-300' :
                        inst.riskLevel === 'high' ? 'bg-yellow-100 border-yellow-300' :
                        'bg-green-100 border-green-300';

                      const textColor =
                        inst.riskLevel === 'critical' ? 'text-red-900' :
                        inst.riskLevel === 'high' ? 'text-yellow-900' :
                        'text-green-900';

                      return (
                        <div key={inst.id} className={`p-4 rounded-lg border-2 ${bgColor}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className={`font-semibold ${textColor}`}>{inst.name}</p>
                              <p className="text-xs text-slate-600">{inst.type}</p>
                            </div>
                            <Badge className={`${
                              inst.riskLevel === 'critical' ? 'bg-red-600' :
                              inst.riskLevel === 'high' ? 'bg-yellow-600' :
                              'bg-green-600'
                            }`}>
                              {inst.riskLevel.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={textColor}>Outstanding:</span>
                              <span className="font-semibold text-slate-900">
                                 Rs. {inst.outstandingAmount.toFixed(0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={textColor}>Limit:</span>
                              <span className="font-semibold text-slate-900">
                                 Rs. {inst.credit_limit.toFixed(0)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between mb-1">
                              <span className={`text-xs font-semibold ${textColor}`}>Utilization</span>
                              <span className={`text-xs font-bold ${textColor}`}>
                                {inst.utilizationPct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-white rounded-full h-2 border border-slate-300">
                              <div
                                className={`h-2 rounded-full ${
                                  inst.riskLevel === 'critical' ? 'bg-red-600' :
                                  inst.riskLevel === 'high' ? 'bg-yellow-600' :
                                  'bg-green-600'
                                }`}
                                style={{ width: `${Math.min(inst.utilizationPct, 100)}%` }}
                              />
                            </div>
                          </div>

                          {inst.overdueCount > 0 && (
                            <div className="mt-3 p-2 bg-red-200 rounded text-xs text-red-900 font-semibold">
                              ⚠️ {inst.overdueCount} overdue invoice(s)
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Institution Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Institution Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Institution</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Outstanding</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Limit</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Utilization</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Overdue</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {institutionMetrics
                        .sort((a, b) => b.utilizationPct - a.utilizationPct)
                        .map(inst => (
                          <tr key={inst.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-semibold text-slate-900">{inst.name}</p>
                                <p className="text-xs text-slate-500">{inst.contact_email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-900">
                              Rs. {inst.outstandingAmount.toFixed(0)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-900">
                              Rs. {inst.credit_limit.toFixed(0)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-semibold text-slate-900">
                                {inst.utilizationPct.toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {inst.overdueCount > 0 ? (
                                <Badge className="bg-red-100 text-red-700 mx-auto">
                                  {inst.overdueCount}
                                </Badge>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={`mx-auto ${
                                inst.riskLevel === 'critical' ? 'bg-red-600' :
                                inst.riskLevel === 'high' ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}>
                                {inst.riskLevel}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}