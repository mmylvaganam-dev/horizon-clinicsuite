import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ChevronDown, ChevronUp, CreditCard, ShoppingCart, TrendingUp, Info } from 'lucide-react';

const TAB_INFO = {
  dashboard: {
    title: 'Dashboard Overview',
    description: 'Real-time snapshot of all wholesale activity across all registered companies on this platform.',
  },
  catalog: {
    title: 'Product Catalog',
    description: 'All products listed here are available for any registered pharmacy or clinic to order via the Wholesale Portal.',
  },
  orders: {
    title: 'Order Management',
    description: 'Orders placed by pharmacies/clinics appear here. Approve, process, ship and mark as delivered to update the ordering company\'s status.',
  },
  credit: {
    title: 'Credit Accounts',
    description: 'Each company can be assigned a credit limit. When an order is placed on credit, the outstanding balance increases. Payments reduce the balance.',
  },
  payments: {
    title: 'Payment Records',
    description: 'Recording a payment here automatically reduces the outstanding credit balance for that company.',
  },
};

export default function WSCompanyInfoBar({ tab }) {
  const [expanded, setExpanded] = useState(false);

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.CompanyProfile.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['wsCreditAccounts'], queryFn: () => base44.entities.WholesaleCreditAccount.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['wsOrders'], queryFn: () => base44.entities.WholesaleOrder.list('-created_date', 100) });

  const info = TAB_INFO[tab] || TAB_INFO.dashboard;

  // Build per-company summary
  const companySummaries = companies.map(c => {
    const account = accounts.find(a => a.company_id === c.id);
    const companyOrders = orders.filter(o => o.company_id === c.id);
    const pendingOrders = companyOrders.filter(o => o.status === 'pending').length;
    const totalOrders = companyOrders.length;
    const outstanding = account?.current_balance || 0;
    const creditLimit = account?.credit_limit || 0;
    const utilization = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;

    return { ...c, account, pendingOrders, totalOrders, outstanding, creditLimit, utilization };
  }).filter(c => c.totalOrders > 0 || c.account);

  return (
    <div className="rounded-xl border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 overflow-hidden">
      {/* Header bar — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-indigo-100/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Info className="w-4 h-4 text-indigo-600" />
          <div>
            <span className="font-bold text-indigo-900 text-sm">{info.title}</span>
            <span className="text-indigo-600 text-xs ml-2 hidden sm:inline">— {info.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Building2 className="w-3 h-3 mr-1" />
            {companies.length} companies
          </Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-indigo-500" />}
        </div>
      </div>

      {/* Expandable company details */}
      {expanded && (
        <div className="border-t border-indigo-200 px-4 pb-4 pt-3">
          <p className="text-xs text-indigo-500 mb-3 sm:hidden">{info.description}</p>
          {companySummaries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">No companies have placed orders or have credit accounts yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {companySummaries.map(c => (
                <Card key={c.id} className="border border-indigo-200 bg-white/80">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm text-slate-900 truncate flex-1">{c.company_legal_name || c.company_trade_name}</p>
                      <Badge className={
                        c.account?.status === 'active' ? 'bg-green-100 text-green-700 ml-2 text-xs' :
                        c.account?.status === 'suspended' ? 'bg-red-100 text-red-700 ml-2 text-xs' :
                        'bg-slate-100 text-slate-500 ml-2 text-xs'
                      }>
                        {c.account?.status || 'no account'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Orders</span>
                        <span className="font-semibold">{c.totalOrders} total {c.pendingOrders > 0 && <span className="text-yellow-600">({c.pendingOrders} pending)</span>}</span>
                      </div>
                      {c.account && (
                        <>
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Credit Limit</span>
                            <span className="font-semibold">LKR {Number(c.creditLimit).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Outstanding</span>
                            <span className={`font-bold ${c.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>LKR {Number(c.outstanding).toLocaleString()}</span>
                          </div>
                          {c.creditLimit > 0 && (
                            <div className="mt-1">
                              <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${c.utilization >= 90 ? 'bg-red-500' : c.utilization >= 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(c.utilization, 100)}%` }}
                                />
                              </div>
                              <p className="text-right text-slate-400 text-xs mt-0.5">{c.utilization.toFixed(0)}% utilized</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}