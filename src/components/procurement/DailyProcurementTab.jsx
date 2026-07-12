import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, RefreshCw, ChevronDown, ChevronRight, Gift, TrendingDown, Building2, DollarSign } from 'lucide-react';

const dealTypeColors = {
  buy_x_get_y_free: 'bg-purple-100 text-purple-700 border-purple-200',
  bulk_discount: 'bg-blue-100 text-blue-700 border-blue-200',
  flat_discount: 'bg-teal-100 text-teal-700 border-teal-200',
  seasonal_offer: 'bg-amber-100 text-amber-700 border-amber-200',
  credit_note: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  special_pricing: 'bg-rose-100 text-rose-700 border-rose-200',
  none: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function DailyProcurementTab() {
  const [expandedPharm, setExpandedPharm] = useState(null);
  const [expandedSupp, setExpandedSupp] = useState({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['procurementDaily'],
    queryFn: async () => {
      const res = await base44.functions.invoke('generateProcurementIntelligence', { mode: 'daily' });
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const pharmacies = data?.daily_pharmacies || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Today's Procurement — All Pharmacies</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-teal-600" />
              <span className="text-xs text-slate-500">Total Spend Today</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">LKR {(summary.total_procurement_value || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-slate-500">Free Items from Deals</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{summary.total_free_items || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-green-600" />
              <span className="text-xs text-slate-500">Deal Savings</span>
            </div>
            <p className="text-2xl font-bold text-green-700">LKR {(summary.total_deal_savings || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-500">Pharmacies / Suppliers</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{summary.total_pharmacies || 0} / {summary.total_suppliers || 0}</p>
          </CardContent>
        </Card>
      </div>

      {pharmacies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No stock receipts recorded today yet.</p>
            <p className="text-xs mt-1">Deal data appears here when pharmacies receive stock with supplier and deal information.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pharmacies.map((pharm) => {
            const isExpanded = expandedPharm === pharm.pharmacy;
            return (
              <Card key={pharm.pharmacy}>
                <CardHeader
                  className="cursor-pointer flex flex-row items-center justify-between py-3"
                  onClick={() => setExpandedPharm(isExpanded ? null : pharm.pharmacy)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <CardTitle className="text-base">{pharm.pharmacy}</CardTitle>
                    <Badge variant="secondary">{pharm.suppliers.length} suppliers</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-600">Spend: <strong>LKR {pharm.total_cost.toLocaleString()}</strong></span>
                    {pharm.total_free_items > 0 && (
                      <span className="text-purple-600">Free: <strong>{pharm.total_free_items}</strong></span>
                    )}
                    {pharm.total_savings > 0 && (
                      <span className="text-green-600">Saved: <strong>LKR {pharm.total_savings.toLocaleString()}</strong></span>
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {pharm.suppliers.map((supp) => {
                      const suppKey = `${pharm.pharmacy}_${supp.supplier}`;
                      const suppExpanded = expandedSupp[suppKey];
                      return (
                        <div key={suppKey} className="border border-slate-200 rounded-lg">
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
                            onClick={() => setExpandedSupp(prev => ({ ...prev, [suppKey]: !prev[suppKey] }))}
                          >
                            <div className="flex items-center gap-2">
                              {suppExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-sm">{supp.supplier}</span>
                              <Badge variant="outline">{supp.lines.length} items</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-600">LKR {supp.total_cost.toLocaleString()}</span>
                              {supp.total_free > 0 && <span className="text-purple-600">{supp.total_free} free</span>}
                              {supp.total_savings > 0 && <span className="text-green-600">Saved LKR {supp.total_savings.toLocaleString()}</span>}
                            </div>
                          </div>
                          {suppExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500">
                                  <tr>
                                    <th className="text-left p-2">Item</th>
                                    <th className="text-right p-2">Qty</th>
                                    <th className="text-right p-2">Free</th>
                                    <th className="text-right p-2">Unit Cost</th>
                                    <th className="text-right p-2">Eff. Cost</th>
                                    <th className="text-right p-2">Total</th>
                                    <th className="text-center p-2">Deal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {supp.lines.map((line, i) => (
                                    <tr key={i} className="border-t border-slate-100">
                                      <td className="p-2">
                                        <div className="font-medium">{line.item_name}</div>
                                        {line.generic_name && <div className="text-xs text-slate-400">{line.generic_name}</div>}
                                      </td>
                                      <td className="text-right p-2">{line.qty_received}</td>
                                      <td className="text-right p-2 text-purple-600 font-medium">{line.qty_free > 0 ? `+${line.qty_free}` : '-'}</td>
                                      <td className="text-right p-2">{line.unit_cost ? `LKR ${line.unit_cost.toFixed(2)}` : '-'}</td>
                                      <td className="text-right p-2 text-teal-600 font-medium">
                                        {line.effective_unit_cost ? `LKR ${line.effective_unit_cost.toFixed(2)}` : '-'}
                                      </td>
                                      <td className="text-right p-2 font-medium">LKR {(line.total_line_cost || 0).toLocaleString()}</td>
                                      <td className="text-center p-2">
                                        {line.deal_type !== 'none' ? (
                                          <span className={`inline-block px-2 py-0.5 rounded text-xs border ${dealTypeColors[line.deal_type] || dealTypeColors.none}`}
                                            title={line.deal_description}>
                                            {line.deal_description || line.deal_type}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}