import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingDown, Factory, DollarSign, Package, Globe, Lightbulb } from 'lucide-react';

export default function NegotiationIntelligenceTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['procurementNegotiation'],
    queryFn: async () => {
      const res = await base44.functions.invoke('generateProcurementIntelligence', { mode: 'yearly' });
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-96 w-full" /></div>;
  }

  const items = data?.negotiation_intelligence || [];
  const summary = data?.summary || {};

  const highLeverage = items.filter(i => i.negotiation_leverage === 'HIGH');
  const manufacturingCandidates = items.filter(i => i.manufacturing_candidate === 'YES');
  const totalVolume = items.reduce((s, i) => s + i.total_volume, 0);
  const totalSpend = items.reduce((s, i) => s + i.total_spend, 0);
  const totalPotentialSavings = items.reduce((s, i) => s + (i.total_spend * (i.price_variance_pct / 100) * 0.5), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Negotiation Intelligence</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Strategic Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-5">
            <Package className="w-5 h-5 text-blue-600 mb-1" />
            <span className="text-xs text-slate-500">Total Volume (yr)</span>
            <p className="text-2xl font-bold text-blue-900">{totalVolume.toLocaleString()} units</p>
            <p className="text-xs text-slate-400 mt-1">Across {summary.total_pharmacies || 0} pharmacies</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="pt-5">
            <DollarSign className="w-5 h-5 text-teal-600 mb-1" />
            <span className="text-xs text-slate-500">Total Spend (yr)</span>
            <p className="text-2xl font-bold text-teal-900">LKR {totalSpend.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-5">
            <TrendingDown className="w-5 h-5 text-green-600 mb-1" />
            <span className="text-xs text-slate-500">Potential Savings</span>
            <p className="text-2xl font-bold text-green-900">LKR {totalPotentialSavings.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">If all buy at best price</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="pt-5">
            <Factory className="w-5 h-5 text-amber-600 mb-1" />
            <span className="text-xs text-slate-500">Mfg. Candidates</span>
            <p className="text-2xl font-bold text-amber-900">{manufacturingCandidates.length}</p>
            <p className="text-xs text-slate-400 mt-1">High volume + high spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insight */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-slate-900 mb-1">How to use this data:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Negotiation Leverage:</strong> Medicines marked HIGH volume (&gt;1,000 units/yr) give you bargaining power with global suppliers for bulk pricing.</li>
                <li><strong>Price Variance:</strong> High variance % means different pharmacies pay different prices — consolidate purchasing to negotiate uniform best pricing.</li>
                <li><strong>Manufacturing Candidates:</strong> High spend (&gt;LKR 500K) + high volume (&gt;500 units) medicines are worth investing in local manufacturing.</li>
                <li><strong>Best Price Column:</strong> Shows the lowest effective price already achieved — use as your benchmark when negotiating with new suppliers.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Negotiation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 20 Medicines — Volume, Price Range & Leverage</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No procurement data yet for this year.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="text-left p-2">Medicine</th>
                    <th className="text-right p-2">Annual Volume</th>
                    <th className="text-right p-2">Annual Spend</th>
                    <th className="text-right p-2">Avg Price</th>
                    <th className="text-right p-2">Min Price</th>
                    <th className="text-right p-2">Max Price</th>
                    <th className="text-right p-2">Price Variance</th>
                    <th className="text-center p-2">Suppliers</th>
                    <th className="text-center p-2">Leverage</th>
                    <th className="text-center p-2">Mfg. Candidate</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-2 font-medium">{item.medicine}</td>
                      <td className="text-right p-2">{item.total_volume.toLocaleString()}</td>
                      <td className="text-right p-2 font-medium">LKR {item.total_spend.toLocaleString()}</td>
                      <td className="text-right p-2">LKR {item.current_avg_price.toFixed(2)}</td>
                      <td className="text-right p-2 text-green-600">LKR {item.current_min_price.toFixed(2)}</td>
                      <td className="text-right p-2 text-red-600">LKR {item.current_max_price.toFixed(2)}</td>
                      <td className="text-right p-2">
                        <span className={item.price_variance_pct > 15 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                          {item.price_variance_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center p-2">{item.supplier_count}</td>
                      <td className="text-center p-2">
                        <Badge className={
                          item.negotiation_leverage === 'HIGH' ? 'bg-green-100 text-green-700' :
                          item.negotiation_leverage === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }>
                          {item.negotiation_leverage}
                        </Badge>
                      </td>
                      <td className="text-center p-2">
                        {item.manufacturing_candidate === 'YES' ? (
                          <Badge className="bg-indigo-100 text-indigo-700"><Factory className="w-3 h-3 mr-1" />YES</Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}