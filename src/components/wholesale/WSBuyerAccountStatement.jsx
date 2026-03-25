import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus, FileText, CreditCard, ImageIcon } from 'lucide-react';
import WSPaymentDialog from './WSPaymentDialog';
import WSChequeStatusManager from './WSChequeStatusManager';

const METHOD_COLOR = {
  cash: 'bg-green-100 text-green-700',
  bank_transfer: 'bg-blue-100 text-blue-700',
  cheque: 'bg-purple-100 text-purple-700',
  credit_note: 'bg-orange-100 text-orange-700',
};

export default function WSBuyerAccountStatement({ connection, orgId, user }) {
  const [payOpen, setPayOpen] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ['wsBuyerPayments', connection.provider_id, connection.buyer_company_id],
    queryFn: () => base44.entities.WholesalePayment.filter({ provider_id: connection.provider_id, company_id: connection.buyer_company_id }, '-created_date', 50),
    enabled: !!connection.provider_id,
  });

  const { data: creditAccount } = useQuery({
    queryKey: ['wsBuyerCreditAcct', connection.provider_id, connection.buyer_company_id],
    queryFn: async () => {
      const accts = await base44.entities.WholesaleCreditAccount.filter({ provider_id: connection.provider_id, company_id: connection.buyer_company_id });
      return accts[0] || null;
    },
    enabled: !!connection.provider_id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['wsBuyerOrders', orgId, connection.provider_id],
    queryFn: () => base44.entities.WholesaleOrder.filter({ organization_id: orgId, provider_id: connection.provider_id }, '-created_date', 20),
    enabled: !!orgId,
  });

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstanding = creditAccount?.current_balance || 0;
  const creditLimit = creditAccount?.credit_limit || 0;
  const utilPct = creditLimit > 0 ? Math.min(100, (outstanding / creditLimit) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Credit Limit</p>
          <p className="font-black text-xl text-slate-800">LKR {creditLimit.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{creditAccount?.payment_terms_days || 30}d terms</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs text-slate-500 mb-1">Outstanding Balance</p>
          <p className={`font-black text-xl ${outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>LKR {outstanding.toLocaleString()}</p>
          {creditLimit > 0 && (
            <div className="mt-1 h-1.5 bg-slate-200 rounded-full">
              <div className={`h-1.5 rounded-full ${utilPct > 80 ? 'bg-red-500' : utilPct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${utilPct}%` }} />
            </div>
          )}
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center col-span-2 md:col-span-1">
          <p className="text-xs text-slate-500 mb-1">Total Paid</p>
          <p className="font-black text-xl text-indigo-700">LKR {totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Submit payment button */}
      {outstanding > 0 && (
        <div className="flex justify-end">
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setPayOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Submit Payment
          </Button>
        </div>
      )}

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Recent Orders</p>
          <div className="space-y-2">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 px-3 bg-white border border-slate-100 rounded-xl text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{o.order_number}</p>
                  <p className="text-xs text-slate-400">{new Date(o.created_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-700">LKR {o.total?.toLocaleString()}</p>
                  <Badge className={o.payment_status === 'paid' ? 'bg-green-100 text-green-700 text-xs' : o.payment_status === 'credit' ? 'bg-blue-100 text-blue-700 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                    {o.payment_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> Payment History</p>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-white border border-slate-100 rounded-xl text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${METHOD_COLOR[p.payment_method] || 'bg-slate-100 text-slate-600'} text-xs`}>
                      {p.payment_method?.replace('_', ' ')}
                    </Badge>
                    {p.payment_method === 'cheque' && (
                      <span className="text-xs text-slate-500">#{p.cheque_number} {p.cheque_bank ? `· ${p.cheque_bank}` : ''}</span>
                    )}
                    {p.submitted_by_buyer && <Badge className="bg-indigo-100 text-indigo-700 text-xs">Submitted by you</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{p.payment_date} {p.order_number && `· ${p.order_number}`}</p>
                  {p.payment_method === 'cheque' && p.cheque_image_url && (
                    <a href={p.cheque_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-xs mt-0.5">
                      <ImageIcon className="w-3 h-3" /> View cheque
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700">LKR {p.amount?.toLocaleString()}</p>
                  {p.payment_method === 'cheque' && (
                    <Badge className={
                      p.cheque_status === 'cleared' ? 'bg-green-100 text-green-700 text-xs' :
                      p.cheque_status === 'returned' ? 'bg-red-100 text-red-700 text-xs' :
                      p.cheque_status === 'deposited' ? 'bg-blue-100 text-blue-700 text-xs' :
                      'bg-yellow-100 text-yellow-700 text-xs'
                    }>
                      {p.cheque_status || 'pending'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WSPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        providerId={connection.provider_id}
        companyId={connection.buyer_company_id}
        companyName={connection.buyer_name}
        userEmail={user?.email}
        submittedByBuyer={true}
      />
    </div>
  );
}