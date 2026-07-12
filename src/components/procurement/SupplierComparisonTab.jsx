import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Building2, ChevronDown, ChevronRight, Gift, TrendingDown, Award } from 'lucide-react';

export default function SupplierComparisonTab() {
  const [mode, setMode] = useState('yearly');
  const [expanded, setExpanded] = useState({});
  const [compareMedicine, setCompareMedicine] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['procurementSuppliers', mode],
    queryFn: async () => {
      const res = await base44.functions.invoke('generateProcurementIntelligence', { mode });
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-96 w-full" /></div>;
  }

  const suppliers = data?.supplier_comparison || [];
  const allMedicines = [...new Set(suppliers.flatMap(s => s.medicines.map(m => m.medicine)))].sort();

  // Build comparison matrix: for each medicine, show all suppliers' prices
  const medicineComparison = {};
  allMedicines.forEach(med => {
    medicineComparison[med] = [];
    suppliers.forEach(supp => {
      const medData = supp.medicines.find(m => m.medicine === med);
      if (medData) {
        medicineComparison[med].push({
          supplier: supp.supplier,
          unit_cost: medData.unit_cost,
          effective_cost: medData.effective_cost,
          deal_type: medData.deal_type,
          deal_description: medData.deal_description,
          qty_delivered: medData.qty_delivered,
        });
      }
    });
  });

  // Find best price per medicine
  const bestPrices = {};
  Object.entries(medicineComparison).forEach(([med, entries]) => {
    if (entries.length > 0) {
      const best = entries.reduce((min, e) =>
        (e.effective_cost || e.unit_cost) < (min.effective_cost || min.unit_cost) ? e : min
      );
      bestPrices[med] = best;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Supplier Comparison</h2>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Supplier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {suppliers.map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-900">{s.supplier}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400 text-xs">Total Spend</span><p className="font-bold">LKR {s.total_cost.toLocaleString()}</p></div>
                <div><span className="text-slate-400 text-xs">Medicines</span><p className="font-bold">{s.medicines.length}</p></div>
                <div><span className="text-slate-400 text-xs">Free Items</span><p className="font-bold text-purple-600">{s.total_free_items}</p></div>
                <div><span className="text-slate-400 text-xs">Savings</span><p className="font-bold text-green-600">LKR {s.total_savings.toLocaleString()}</p></div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Supplies to {s.pharmacy_count} pharmacies · {s.total_lines} deliveries
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Medicine Price Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Price Comparison by Medicine — Best Effective Price Highlighted
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {allMedicines.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No supplier data for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="text-left p-2 sticky left-0 bg-slate-50">Medicine</th>
                    {suppliers.map(s => (
                      <th key={s.supplier} className="text-right p-2 whitespace-nowrap">{s.supplier}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allMedicines.filter(m => compareMedicine === 'all' || m === compareMedicine).map((med) => {
                    const entries = medicineComparison[med];
                    const best = bestPrices[med];
                    return (
                      <tr key={med} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-medium sticky left-0 bg-white">{med}</td>
                        {suppliers.map(s => {
                          const entry = entries.find(e => e.supplier === s.supplier);
                          if (!entry) return <td key={s.supplier} className="text-center p-2 text-slate-300">-</td>;
                          const price = entry.effective_cost || entry.unit_cost;
                          const isBest = best && best.supplier === s.supplier;
                          return (
                            <td key={s.supplier} className={`text-right p-2 ${isBest ? 'bg-green-50' : ''}`}>
                              <div className={isBest ? 'font-bold text-green-700' : 'font-medium'}>LKR {price.toFixed(2)}</div>
                              {entry.deal_type !== 'none' && (
                                <div className="text-xs text-purple-600 truncate max-w-[120px]">{entry.deal_description}</div>
                              )}
                              {isBest && <div className="text-xs text-green-600">★ Best</div>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}