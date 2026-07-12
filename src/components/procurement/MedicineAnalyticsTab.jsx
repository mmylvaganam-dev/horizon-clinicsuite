import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, BarChart3, DollarSign, Package, TrendingDown, Search } from 'lucide-react';

export default function MedicineAnalyticsTab() {
  const [mode, setMode] = useState('monthly');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['procurementAnalytics', mode],
    queryFn: async () => {
      const res = await base44.functions.invoke('generateProcurementIntelligence', { mode });
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const medicines = data?.medicine_analytics || [];
  const filtered = medicines.filter(m =>
    m.medicine.toLowerCase().includes(search.toLowerCase()) ||
    m.item_names.some(n => n.toLowerCase().includes(search.toLowerCase()))
  );

  const topByVolume = [...medicines].sort((a, b) => b.total_qty_purchased - a.total_qty_purchased).slice(0, 5);
  const topBySpend = [...medicines].sort((a, b) => b.total_cost - a.total_cost).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Medicine Procurement Analytics</h2>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-teal-600" /><span className="text-xs text-slate-500">Total Spend ({mode})</span></div>
          <p className="text-2xl font-bold text-slate-900">LKR {(summary.total_procurement_value || 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-blue-600" /><span className="text-xs text-slate-500">Total Items Purchased</span></div>
          <p className="text-2xl font-bold text-slate-900">{medicines.reduce((s, m) => s + m.total_qty_purchased, 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-green-600" /><span className="text-xs text-slate-500">Deal Savings</span></div>
          <p className="text-2xl font-bold text-green-700">LKR {(summary.total_deal_savings || 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-purple-600" /><span className="text-xs text-slate-500">Unique Medicines</span></div>
          <p className="text-2xl font-bold text-slate-900">{medicines.length}</p>
        </CardContent></Card>
      </div>

      {/* Top 5 by Volume and Spend */}
      {medicines.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top 5 by Volume</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {topByVolume.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{m.medicine}</span>
                    <span className="font-medium ml-2">{m.total_qty_purchased.toLocaleString()} units</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Top 5 by Spend</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {topBySpend.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{m.medicine}</span>
                    <span className="font-medium ml-2">LKR {m.total_cost.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Medicine Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">All Medicines — Price Ranges & Deals</CardTitle>
          <div className="relative w-48">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
            <Input placeholder="Search medicine..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No procurement data for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="text-left p-2">Medicine</th>
                    <th className="text-right p-2">Qty Bought</th>
                    <th className="text-right p-2">Free</th>
                    <th className="text-right p-2">Avg Price</th>
                    <th className="text-right p-2">Min - Max</th>
                    <th className="text-right p-2">Total Spend</th>
                    <th className="text-right p-2">Savings</th>
                    <th className="text-center p-2">Suppliers</th>
                    <th className="text-center p-2">Deals</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-2">
                        <div className="font-medium">{m.medicine}</div>
                        {m.item_names.length > 1 && <div className="text-xs text-slate-400 truncate max-w-xs">{m.item_names.join(', ')}</div>}
                      </td>
                      <td className="text-right p-2 font-medium">{m.total_qty_purchased.toLocaleString()}</td>
                      <td className="text-right p-2 text-purple-600">{m.total_qty_free > 0 ? m.total_qty_free : '-'}</td>
                      <td className="text-right p-2">LKR {m.avg_unit_cost.toFixed(2)}</td>
                      <td className="text-right p-2 text-xs">
                        {m.min_unit_cost > 0 ? `LKR ${m.min_unit_cost.toFixed(2)} - ${m.max_unit_cost.toFixed(2)}` : '-'}
                      </td>
                      <td className="text-right p-2 font-medium">LKR {m.total_cost.toLocaleString()}</td>
                      <td className="text-right p-2 text-green-600">{m.total_savings > 0 ? `LKR ${m.total_savings.toLocaleString()}` : '-'}</td>
                      <td className="text-center p-2">{m.supplier_count}</td>
                      <td className="text-center p-2">
                        {m.deal_count > 0 ? <Badge className="bg-purple-100 text-purple-700">{m.deal_count}</Badge> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}