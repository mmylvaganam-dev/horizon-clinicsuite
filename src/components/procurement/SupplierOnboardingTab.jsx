import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, TrendingUp, Package, Users, DollarSign, CheckCircle2, AlertCircle, Star, ArrowRight, Phone, Mail } from 'lucide-react';

const PLAN_SUGGEST = (monthlyVolume) => {
  if (monthlyVolume > 500000) return { plan: 'enterprise', fee: 75000, label: 'Enterprise' };
  if (monthlyVolume > 100000) return { plan: 'professional', fee: 35000, label: 'Professional' };
  return { plan: 'starter', fee: 15000, label: 'Starter' };
};

export default function SupplierOnboardingTab() {
  const [selected, setSelected] = useState(null);

  const { data: grnLines = [], isLoading } = useQuery({
    queryKey: ['grnLinesAllForOnboarding'],
    queryFn: () => base44.asServiceRole.entities.GoodsReceivedLine.list('-created_date', 500),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['wsProvidersForOnboarding'],
    queryFn: async () => {
      const all = await base44.entities.WholesaleProvider.list();
      return all.filter(p => p.company_code && p.company_name);
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['wsSubsForOnboarding'],
    queryFn: () => base44.entities.WholesaleSubscription.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['wsOrdersForOnboarding'],
    queryFn: () => base44.entities.WholesaleOrder.list('-created_date', 100),
  });

  // Aggregate procurement data by supplier
  const supplierStats = useMemo(() => {
    const map = {};
    grnLines.forEach(line => {
      const name = line.supplier_name || 'Unknown Supplier';
      if (!map[name]) {
        map[name] = { name, totalBoxes: 0, totalSpend: 0, totalSavings: 0, pharmacies: new Set(), medicines: {}, dealCount: 0 };
      }
      const s = map[name];
      s.totalBoxes += line.qty_received || 0;
      s.totalSpend += line.total_line_cost || 0;
      s.totalSavings += line.deal_savings || 0;
      if (line.deal_type && line.deal_type !== 'none') s.dealCount++;
      if (line.organization_id) s.pharmacies.add(line.organization_id);
      const medKey = line.generic_name || line.item_name || 'Unknown';
      if (!s.medicines[medKey]) s.medicines[medKey] = { boxes: 0, spend: 0 };
      s.medicines[medKey].boxes += line.qty_received || 0;
      s.medicines[medKey].spend += line.total_line_cost || 0;
    });
    return Object.values(map).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [grnLines]);

  // Match suppliers to existing wholesale providers
  const enriched = useMemo(() => {
    return supplierStats.map(s => {
      const matchedProvider = providers.find(p =>
        p.company_name?.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(p.company_name?.toLowerCase() || '___')
      );
      const sub = matchedProvider ? subscriptions.find(su => su.provider_id === matchedProvider.id) : null;
      const orderCount = matchedProvider ? orders.filter(o => o.provider_id === matchedProvider.id).length : 0;
      const planSuggest = PLAN_SUGGEST(s.totalSpend / 12);
      return {
        ...s,
        pharmacyCount: s.pharmacies.size,
        topMedicines: Object.entries(s.medicines).sort((a, b) => b[1].spend - a[1].spend).slice(0, 5),
        isOnPlatform: !!matchedProvider,
        provider: matchedProvider,
        subscription: sub,
        platformOrders: orderCount,
        suggestedPlan: planSuggest,
        annualRevenue: planSuggest.fee * 12,
      };
    });
  }, [supplierStats, providers, subscriptions, orders]);

  const notOnPlatform = enriched.filter(s => !s.isOnPlatform);
  const onPlatform = enriched.filter(s => s.isOnPlatform);
  const totalProjectedRevenue = notOnPlatform.reduce((s, r) => s + r.annualRevenue, 0);
  const totalExistingRevenue = onPlatform.reduce((s, r) => s + (r.subscription?.monthly_fee || 0) * 12, 0);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>;
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-5">
            <AlertCircle className="w-5 h-5 text-amber-600 mb-1" />
            <p className="text-xs text-amber-700 font-medium">Suppliers to Onboard</p>
            <p className="font-black text-2xl text-amber-800">{notOnPlatform.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-5">
            <CheckCircle2 className="w-5 h-5 text-green-600 mb-1" />
            <p className="text-xs text-green-700 font-medium">Already on Platform</p>
            <p className="font-black text-2xl text-green-800">{onPlatform.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-5">
            <DollarSign className="w-5 h-5 text-blue-600 mb-1" />
            <p className="text-xs text-blue-700 font-medium">Projected App Revenue/yr</p>
            <p className="font-black text-2xl text-blue-800">LKR {totalProjectedRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-teal-50 border-teal-200">
          <CardContent className="pt-5">
            <Star className="w-5 h-5 text-teal-600 mb-1" />
            <p className="text-xs text-teal-700 font-medium">Existing Sub Revenue/yr</p>
            <p className="font-black text-2xl text-teal-800">LKR {totalExistingRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600">
              <strong className="text-slate-900">Supplier Onboarding Strategy:</strong> These suppliers are currently selling
              to your pharmacies offline. Invite them to the Wholesale Platform — they'll pay a monthly subscription,
              receive pharmacy orders directly in the app, manage deliveries, and track cheque payments (including returned cheques).
              You earn app fees from every supplier on the platform.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers NOT on platform — negotiation targets */}
      {notOnPlatform.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Negotiation Targets — Not Yet On Platform
          </h2>
          <div className="space-y-3">
            {notOnPlatform.map((s, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <h3 className="font-bold text-slate-900">{s.name}</h3>
                        <Badge className="bg-amber-100 text-amber-700">Not Onboarded</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Annual Spend</p>
                          <p className="font-bold text-slate-700">LKR {s.totalSpend.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Boxes/Year</p>
                          <p className="font-bold text-slate-700">{s.totalBoxes.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Pharmacies Buying</p>
                          <p className="font-bold text-slate-700">{s.pharmacyCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Deal Savings Captured</p>
                          <p className="font-bold text-green-600">LKR {s.totalSavings.toLocaleString()}</p>
                        </div>
                      </div>
                      {s.topMedicines.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {s.topMedicines.map(([med, data]) => (
                            <Badge key={med} variant="outline" className="text-xs">
                              {med}: {data.boxes} boxes
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-center">
                        <p className="text-xs text-indigo-600 font-medium">Suggested Plan</p>
                        <p className="font-bold text-indigo-900">{s.suggestedPlan.label}</p>
                        <p className="text-xs text-indigo-500">LKR {s.suggestedPlan.fee.toLocaleString()}/mo</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelected(s)}>
                        View Brief <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Suppliers already on platform */}
      {onPlatform.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Already On Platform
          </h2>
          <div className="space-y-3">
            {onPlatform.map((s, i) => (
              <Card key={i} className="border-green-200">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-slate-900">{s.name}</h3>
                        <Badge className="bg-green-100 text-green-700">On Platform</Badge>
                        {s.subscription && (
                          <Badge className="bg-indigo-100 text-indigo-700">{s.subscription.plan_name} · LKR {(s.subscription.monthly_fee || 0).toLocaleString()}/mo</Badge>
                        )}
                        {s.subscription?.status === 'trial' && (
                          <Badge className="bg-yellow-100 text-yellow-700">Trial</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Annual Spend</p>
                          <p className="font-bold text-slate-700">LKR {s.totalSpend.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Platform Orders</p>
                          <p className="font-bold text-slate-700">{s.platformOrders}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Pharmacies</p>
                          <p className="font-bold text-slate-700">{s.pharmacyCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Contact</p>
                          <p className="font-bold text-slate-700 text-xs">{s.provider?.phone || s.provider?.email || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Negotiation Brief Dialog */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Supplier Negotiation Brief</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{selected.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Value proposition */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
                <h4 className="font-bold text-teal-900 mb-2">What They Get by Joining</h4>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" /> Receive orders directly from {selected.pharmacyCount} pharmacies in real-time</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" /> Manage daily/regular deliveries with driver & vehicle tracking</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" /> Track cheque payments — mark as deposited, cleared, or returned</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" /> Credit account management with automatic balance updates</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" /> Product catalog published to all connected pharmacies</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" /> Returns management and buyer messaging built-in</li>
                </ul>
              </div>

              {/* Volume data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Current Annual Volume</p>
                  <p className="font-black text-xl text-slate-800">LKR {selected.totalSpend.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{selected.totalBoxes.toLocaleString()} boxes/year</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-indigo-500">Suggested Plan</p>
                  <p className="font-black text-xl text-indigo-900">{selected.suggestedPlan.label}</p>
                  <p className="text-xs text-indigo-600">LKR {selected.suggestedPlan.fee.toLocaleString()}/month</p>
                </div>
              </div>

              {/* Top medicines they supply */}
              {selected.topMedicines.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 text-sm">Top Medicines They Supply to Your Pharmacies</h4>
                  <div className="space-y-1.5">
                    {selected.topMedicines.map(([med, data]) => (
                      <div key={med} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium text-slate-700">{med}</span>
                        <span className="text-slate-500">{data.boxes} boxes · LKR {data.spend.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue projection */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <h4 className="font-bold text-green-900">Platform Revenue from This Supplier</h4>
                </div>
                <p className="font-black text-2xl text-green-800">LKR {selected.annualRevenue.toLocaleString()}/year</p>
                <p className="text-xs text-green-600 mt-1">Based on {selected.suggestedPlan.label} plan at LKR {selected.suggestedPlan.fee.toLocaleString()}/month</p>
              </div>

              {/* Call to action */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => {
                  window.location.href = '/WholesalePlatformAdmin';
                }}>
                  <Building2 className="w-4 h-4 mr-2" /> Go to Wholesale Admin to Create
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {enriched.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No procurement data yet</h3>
          <p className="text-slate-500 text-sm mt-1">
            Once pharmacies start receiving stock with supplier details, suppliers will appear here for onboarding analysis.
          </p>
        </Card>
      )}
    </div>
  );
}