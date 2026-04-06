import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, DollarSign, FileText, CheckCircle, Clock, AlertCircle, Search, ExternalLink } from 'lucide-react';
import { formatSL } from '@/components/utils/dateUtils';
import { createPageUrl } from '@/utils';

export default function CreditSalesTab({ sales, creditPayments, currency, fmt, navigate }) {
  const [search, setSearch] = useState('');

  // Identify credit sales
  const creditSales = sales.filter(s => s.status === 'credit' || s.is_credit_sale === true || s.credit_institution);

  // Group by institution
  const byInstitution = creditSales.reduce((acc, sale) => {
    let institution =
      sale.credit_institution ||
      sale.notes?.match(/Bill To:\s*([^|]+)/)?.[1]?.trim() ||
      'Unknown Institution';
    if (!acc[institution]) acc[institution] = { sales: [], payments: [] };
    acc[institution].sales.push(sale);
    return acc;
  }, {});

  // Attach payments
  creditPayments.forEach(p => {
    const inst = p.institution_name;
    if (byInstitution[inst]) byInstitution[inst].payments.push(p);
  });

  const rows = Object.entries(byInstitution).map(([name, { sales, payments }]) => {
    const totalBilled = sales.reduce((s, x) => s + (x.total || 0), 0);
    const totalPaid = payments.reduce((s, x) => s + (x.amount || 0), 0);
    const outstanding = totalBilled - totalPaid;
    const lastSale = sales[0];
    return { name, sales, payments, totalBilled, totalPaid, outstanding, lastSale };
  }).filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const totalBilledAll   = rows.reduce((s, r) => s + r.totalBilled, 0);
  const totalCollected   = rows.reduce((s, r) => s + r.totalPaid, 0);

  // Today's credit sales
  const todayStr = formatSL(new Date(), 'yyyy-MM-dd');
  const todayCreditSales = creditSales.filter(s =>
    s.sale_date && formatSL(new Date(s.sale_date), 'yyyy-MM-dd') === todayStr
  );
  const todayCreditAmount = todayCreditSales.reduce((s, x) => s + (x.total || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Outstanding</p>
          <p className="text-xl font-bold text-amber-700">{currency} {fmt(totalOutstanding)}</p>
          <p className="text-xs text-amber-500 mt-0.5">{rows.filter(r => r.outstanding > 0).length} institutions</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Total Billed</p>
          <p className="text-xl font-bold text-blue-700">{currency} {fmt(totalBilledAll)}</p>
          <p className="text-xs text-blue-500 mt-0.5">{creditSales.length} invoices</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 font-medium mb-1 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Collected</p>
          <p className="text-xl font-bold text-emerald-700">{currency} {fmt(totalCollected)}</p>
          <p className="text-xs text-emerald-500 mt-0.5">{creditPayments.length} payments</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Today's Credit</p>
          <p className="text-xl font-bold text-orange-700">{currency} {fmt(todayCreditAmount)}</p>
          <p className="text-xs text-orange-500 mt-0.5">{todayCreditSales.length} sales today</p>
        </div>
      </div>

      {/* Today's credit sales list */}
      {todayCreditSales.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" /> Today's Credit Sales
          </h4>
          <div className="space-y-1.5">
            {todayCreditSales.map(sale => {
              const inst = sale.credit_institution || sale.notes?.match(/Bill To:\s*([^|]+)/)?.[1]?.trim() || 'Unknown';
              return (
                <div key={sale.id} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">{inst}</p>
                      <p className="text-xs text-slate-500">{sale.sale_number} · {formatSL(new Date(sale.sale_date), 'h:mm a')}</p>
                    </div>
                  </div>
                  <p className="font-bold text-orange-700">{currency} {fmt(sale.total)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Institution breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" /> Account Balances by Institution
          </h4>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 w-48 text-sm" />
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('CreditCustomerManagement'))}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Full Report
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No credit sales found</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b px-4 py-2.5 grid grid-cols-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
              <div className="col-span-4">Institution</div>
              <div className="col-span-2 text-right">Total Billed</div>
              <div className="col-span-2 text-right">Collected</div>
              <div className="col-span-2 text-right">Outstanding</div>
              <div className="col-span-2 text-right">Last Invoice</div>
            </div>
            <div className="divide-y">
              {rows.map(r => (
                <div key={r.name} className={`px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-50 transition-colors ${r.outstanding > 0 ? '' : 'opacity-60'}`}>
                  <div className="col-span-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-slate-900 truncate">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.sales.length} invoice{r.sales.length !== 1 ? 's' : ''} · {r.payments.length} payment{r.payments.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-slate-700">{currency} {fmt(r.totalBilled)}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-emerald-600">{currency} {fmt(r.totalPaid)}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    {r.outstanding > 0 ? (
                      <p className="text-sm font-bold text-red-600">{currency} {fmt(r.outstanding)}</p>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">Settled</Badge>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-xs text-slate-400">
                    {r.lastSale?.sale_date ? formatSL(new Date(r.lastSale.sale_date), 'MMM d, yyyy') : '—'}
                  </div>
                </div>
              ))}
            </div>
            {/* Footer totals */}
            <div className="bg-slate-100 border-t px-4 py-3 grid grid-cols-12 text-sm font-bold text-slate-800">
              <div className="col-span-4">TOTAL</div>
              <div className="col-span-2 text-right">{currency} {fmt(totalBilledAll)}</div>
              <div className="col-span-2 text-right text-emerald-700">{currency} {fmt(totalCollected)}</div>
              <div className="col-span-2 text-right text-red-600">{currency} {fmt(totalOutstanding)}</div>
              <div className="col-span-2"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}