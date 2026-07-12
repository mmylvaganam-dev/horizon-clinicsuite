import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Tag, TrendingDown, X } from 'lucide-react';

/**
 * DealPricingEngine — auto-matches active ProcurementDeal records to the
 * current receive form (supplier + drug/generic + qty) and applies the deal
 * math (BOGO, bulk discount, flat discount, special pricing, seasonal offer).
 *
 * Props:
 *   supplierName, drugName, genericName, skuCode, qty, unitCost, currency,
 *   onApplyDeal(dealResult) — called with { dealType, dealDescription, buyQty, freeQty, discountPct, specialPrice, effectiveUnitCost, dealSavings, totalCost }
 *   onClearDeal()
 *   appliedDealId
 */
export default function DealPricingEngine({
  supplierName, drugName, genericName, skuCode, qty, unitCost, currency = 'LKR',
  onApplyDeal, onClearDeal, appliedDealId,
}) {
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['activeProcDealsForPricing'],
    queryFn: async () => {
      const all = await base44.entities.ProcurementDeal.filter({ is_active: true }, '-created_date', 200);
      return all;
    },
  });

  // Match deals to current supplier + drug
  const matchedDeals = useMemo(() => {
    if (!supplierName) return [];
    const today = new Date().toISOString().slice(0, 10);
    return deals.filter(d => {
      if (d.start_date && today < d.start_date) return false;
      if (d.end_date && today > d.end_date) return false;
      // Supplier match (case-insensitive, partial)
      const supplierMatch =
        (d.supplier_name || '').toLowerCase().includes(supplierName.toLowerCase()) ||
        supplierName.toLowerCase().includes((d.supplier_name || '').toLowerCase());
      if (!supplierMatch) return false;
      // Drug match: sku, drug_name, or generic_name
      const drugMatch =
        (d.sku_code && skuCode && d.sku_code === skuCode) ||
        (d.drug_name && drugName && (d.drug_name.toLowerCase() === drugName.toLowerCase() ||
          drugName.toLowerCase().includes(d.drug_name.toLowerCase()))) ||
        (d.generic_name && genericName && d.generic_name.toLowerCase() === genericName.toLowerCase()) ||
        (!d.drug_name && !d.generic_name && !d.sku_code); // supplier-wide deal
      return drugMatch;
    });
  }, [deals, supplierName, drugName, genericName, skuCode]);

  // Calculate deal outcome for a given deal + qty + unitCost
  const calcDeal = (deal, qtyVal, unitCostVal) => {
    const q = Number(qtyVal) || 0;
    const uc = Number(unitCostVal) || 0;
    const minQty = deal.min_order_qty || deal.buy_qty || 1;
    if (q < minQty) return null; // doesn't qualify

    let buyQty = q, freeQty = 0, effectiveUnitCost = uc, totalCost = q * uc, dealSavings = 0, discountPct = 0, specialPrice = null;

    switch (deal.deal_type) {
      case 'buy_x_get_y_free': {
        if (!deal.buy_qty || deal.buy_qty <= 0) return null;
        const sets = Math.floor(q / deal.buy_qty);
        freeQty = sets * (deal.free_qty || 0);
        buyQty = q - freeQty;
        totalCost = buyQty * uc;
        effectiveUnitCost = (buyQty + freeQty) > 0 ? totalCost / (buyQty + freeQty) : uc;
        dealSavings = freeQty * uc;
        discountPct = (buyQty + freeQty) > 0 ? (freeQty / (buyQty + freeQty)) * 100 : 0;
        break;
      }
      case 'bulk_discount':
      case 'flat_discount':
      case 'seasonal_offer': {
        discountPct = deal.discount_pct || 0;
        effectiveUnitCost = uc * (1 - discountPct / 100);
        totalCost = q * effectiveUnitCost;
        dealSavings = q * uc * (discountPct / 100);
        break;
      }
      case 'special_pricing': {
        specialPrice = deal.special_price || uc;
        effectiveUnitCost = specialPrice;
        totalCost = q * specialPrice;
        dealSavings = q * (uc - specialPrice);
        discountPct = uc > 0 ? ((uc - specialPrice) / uc) * 100 : 0;
        break;
      }
      case 'credit_note':
      default:
        return null;
    }
    return { dealType: deal.deal_type, dealDescription: deal.deal_label || deal.deal_description || '', buyQty, freeQty, discountPct, specialPrice, effectiveUnitCost, dealSavings, totalCost };
  };

  if (!supplierName) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-500 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-slate-400" />
        Enter a supplier to auto-match active deals.
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-xs text-slate-400 p-2">Loading active deals…</div>;
  }

  if (matchedDeals.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-500 flex items-center gap-2">
        <Tag className="w-4 h-4 text-slate-400" />
        No active deals found for <strong className="text-slate-700">{supplierName}</strong>{drugName ? <> · {drugName}</> : null}.
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <h4 className="font-bold text-purple-900 text-sm">Pricing Engine — {matchedDeals.length} Active Deal{matchedDeals.length > 1 ? 's' : ''} Matched</h4>
      </div>
      <div className="space-y-2">
        {matchedDeals.map(deal => {
          const result = calcDeal(deal, qty, unitCost);
          const isApplied = appliedDealId === deal.id;
          const qualifies = !!result;
          return (
            <div key={deal.id} className={`bg-white border rounded-lg p-3 transition-all ${isApplied ? 'border-purple-400 ring-2 ring-purple-200' : qualifies ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className="bg-purple-100 text-purple-700 text-xs">{deal.deal_type.replace(/_/g, ' ')}</Badge>
                    <span className="font-semibold text-slate-800 text-sm">{deal.deal_label}</span>
                    {deal.drug_name && <span className="text-xs text-slate-400">· {deal.drug_name}</span>}
                  </div>
                  {deal.deal_description && (
                    <p className="text-xs text-slate-500">{deal.deal_description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                    {deal.buy_qty > 0 && <span>Buy {deal.buy_qty}{deal.free_qty ? ` → Get ${deal.free_qty} Free` : ''}</span>}
                    {deal.discount_pct > 0 && <span>{deal.discount_pct}% off</span>}
                    {deal.special_price != null && <span>Special: {currency} {deal.special_price}</span>}
                    <span>Min qty: {deal.min_order_qty || deal.buy_qty || 1}</span>
                    {deal.end_date && <span className="text-amber-600">Until {deal.end_date}</span>}
                  </div>
                  {qualifies && result && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-md px-2 py-1.5 text-xs space-y-0.5">
                      <div className="flex justify-between"><span className="text-slate-600">Effective Unit Cost:</span><span className="font-bold text-purple-700">{currency} {result.effectiveUnitCost.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Total Cost:</span><span className="font-medium text-slate-700">{currency} {result.totalCost.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Deal Savings:</span><span className="font-bold text-green-600">{currency} {result.dealSavings.toFixed(2)}</span></div>
                      {result.freeQty > 0 && <div className="flex justify-between"><span className="text-slate-600">Free Items:</span><span className="font-medium text-slate-700">{result.freeQty}</span></div>}
                    </div>
                  )}
                  {!qualifies && (
                    <p className="text-xs text-amber-600 mt-1">Add at least {deal.min_order_qty || deal.buy_qty || 1} units to qualify.</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {isApplied ? (
                    <Button size="sm" variant="outline" onClick={onClearDeal}>
                      <X className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  ) : (
                    <Button size="sm" disabled={!qualifies} onClick={() => onApplyDeal({ dealId: deal.id, ...result })}>
                      <TrendingDown className="w-3 h-3 mr-1" /> Apply
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}