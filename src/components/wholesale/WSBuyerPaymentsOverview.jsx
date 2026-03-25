import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus, ImageIcon } from 'lucide-react';
import WSPaymentDialog from './WSPaymentDialog';
import WSBuyerAccountStatement from './WSBuyerAccountStatement';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const METHOD_COLOR = {
  cash: 'bg-green-100 text-green-700',
  bank_transfer: 'bg-blue-100 text-blue-700',
  cheque: 'bg-purple-100 text-purple-700',
  credit_note: 'bg-orange-100 text-orange-700',
};

export default function WSBuyerPaymentsOverview({ orgId, connections, user }) {
  const [selectedConn, setSelectedConn] = useState(null);

  // Load all payments submitted by this org across all providers
  const { data: org } = useQuery({
    queryKey: ['orgDetail', orgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.filter({ id: orgId });
      return orgs[0] || null;
    },
    enabled: !!orgId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['wsBuyerAllPayments', org?.company_id],
    queryFn: () => base44.entities.WholesalePayment.filter({ company_id: org.company_id }, '-created_date', 100),
    enabled: !!org?.company_id,
  });

  const totalSubmitted = payments.filter(p => p.cheque_status !== 'returned').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingCheques = payments.filter(p => p.payment_method === 'cheque' && (p.cheque_status === 'pending' || p.cheque_status === 'deposited'));
  const clearedCheques = payments.filter(p => p.payment_method === 'cheque' && p.cheque_status === 'cleared');
  const returnedCheques = payments.filter(p => p.payment_method === 'cheque' && p.cheque_status === 'returned');

  return (
    <div className="space-y-5 mt-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Total Paid</p>
          <p className="font-black text-xl text-green-700">LKR {totalSubmitted.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Cheques Pending</p>
          <p className="font-black text-xl text-purple-700">{pendingCheques.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Cheques Cleared</p>
          <p className="font-black text-xl text-blue-700">{clearedCheques.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Cheques Returned</p>
          <p className="font-black text-xl text-red-700">{returnedCheques.length}</p>
        </div>
      </div>

      {/* Supplier account buttons */}
      {connections.length > 0 && (
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">Pay or View Account by Supplier</p>
          <div className="flex flex-wrap gap-2">
            {connections.map(c => (
              <Button key={c.id} variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setSelectedConn(c)}>
                <DollarSign className="w-3 h-3 mr-1" /> {c.provider_name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* All payments */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">All Payments</p>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No payments submitted yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <Card key={p.id} className={`border ${p.cheque_status === 'returned' ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{p.provider_id ? connections.find(c => c.provider_id === p.provider_id)?.provider_name || 'Supplier' : 'Supplier'}</p>
                        <Badge className={METHOD_COLOR[p.payment_method] || 'bg-slate-100 text-slate-600'}>
                          {p.payment_method?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{p.payment_date} {p.order_number && `· Order: ${p.order_number}`}</p>
                      {p.payment_method === 'cheque' && (
                        <p className="text-xs text-slate-400 mt-0.5">Cheque #{p.cheque_number} {p.cheque_bank && `· ${p.cheque_bank}`}</p>
                      )}
                      {p.cheque_return_reason && <p className="text-xs text-red-600 mt-0.5">Returned: {p.cheque_return_reason}</p>}
                      {p.cheque_image_url && (
                        <a href={p.cheque_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-xs mt-1">
                          <ImageIcon className="w-3 h-3" /> View cheque
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-lg ${p.cheque_status === 'returned' ? 'text-red-500 line-through' : 'text-green-700'}`}>
                        LKR {p.amount?.toLocaleString()}
                      </p>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Per-supplier account dialog */}
      <Dialog open={!!selectedConn} onOpenChange={o => !o && setSelectedConn(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account — {selectedConn?.provider_name}</DialogTitle>
          </DialogHeader>
          {selectedConn && (
            <WSBuyerAccountStatement connection={selectedConn} orgId={orgId} user={user} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}