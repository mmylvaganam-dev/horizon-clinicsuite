import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, ImageIcon } from 'lucide-react';
import WSPaymentDialog from './WSPaymentDialog';
import WSChequeStatusManager from './WSChequeStatusManager';

const METHOD_COLOR = {
  cash: 'bg-green-100 text-green-700',
  bank_transfer: 'bg-blue-100 text-blue-700',
  cheque: 'bg-purple-100 text-purple-700',
  credit_note: 'bg-orange-100 text-orange-700',
};

export default function WSProviderPayments({ provider }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: payments = [] } = useQuery({
    queryKey: ['wsPayments', provider.id],
    queryFn: () => base44.entities.WholesalePayment.filter({ provider_id: provider.id }, '-created_date', 100),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['wsConnections', provider.id],
    queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: provider.id, status: 'active' }),
  });

  const totalReceived = payments.filter(p => p.cheque_status !== 'returned').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingCheques = payments.filter(p => p.payment_method === 'cheque' && (p.cheque_status === 'pending' || p.cheque_status === 'deposited'));

  const openRecordPayment = (conn) => {
    setSelectedConnection(conn);
    setOpen(true);
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3">
          <p className="text-xs text-green-700 font-medium">Total Collected (excl. returned)</p>
          <p className="font-black text-2xl text-green-800">LKR {totalReceived.toLocaleString()}</p>
        </div>
        {pendingCheques.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3">
            <p className="text-xs text-purple-700 font-medium">Cheques Awaiting Clearance</p>
            <p className="font-black text-2xl text-purple-800">{pendingCheques.length}</p>
          </div>
        )}
        <div className="ml-auto">
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setSelectedConnection(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Pending cheques alert */}
      {pendingCheques.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm font-bold text-purple-800 mb-2">⚠️ Cheques Pending Action ({pendingCheques.length})</p>
          <div className="space-y-2">
            {pendingCheques.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-purple-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.company_name} — #{p.cheque_number}</p>
                  <p className="text-xs text-slate-400">{p.cheque_bank} · {p.cheque_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-indigo-700 text-sm">LKR {p.amount?.toLocaleString()}</p>
                  <WSChequeStatusManager payment={p} providerId={provider.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All payments list */}
      <div className="space-y-2">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No payments recorded yet</p></div>
        ) : payments.map(p => (
          <Card key={p.id} className={`border ${p.payment_method === 'cheque' && p.cheque_status === 'returned' ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{p.company_name}</p>
                    <Badge className={METHOD_COLOR[p.payment_method] || 'bg-slate-100 text-slate-600'}>
                      {p.payment_method?.replace('_', ' ')}
                    </Badge>
                    {p.submitted_by_buyer && <Badge className="bg-indigo-100 text-indigo-700 text-xs">Buyer submitted</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{p.payment_date} {p.order_number && `· Order: ${p.order_number}`}</p>
                  {p.payment_method === 'cheque' && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cheque #{p.cheque_number} {p.cheque_bank && `· ${p.cheque_bank}`} {p.cheque_date && `· dated ${p.cheque_date}`}
                    </p>
                  )}
                  {p.cheque_return_reason && <p className="text-xs text-red-600 mt-0.5">Return reason: {p.cheque_return_reason}</p>}
                  {p.cheque_image_url && (
                    <a href={p.cheque_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-xs mt-1">
                      <ImageIcon className="w-3 h-3" /> View cheque image
                    </a>
                  )}
                  {p.notes && <p className="text-xs text-slate-400 italic mt-0.5">"{p.notes}"</p>}
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg ${p.cheque_status === 'returned' ? 'text-red-500 line-through' : 'text-green-700'}`}>
                    LKR {p.amount?.toLocaleString()}
                  </p>
                  {p.payment_method === 'cheque' && (
                    <WSChequeStatusManager payment={p} providerId={provider.id} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Record payment dialog */}
      <WSPaymentDialog
        open={open}
        onOpenChange={setOpen}
        providerId={provider.id}
        companyId={selectedConnection?.buyer_company_id || ''}
        companyName={selectedConnection?.buyer_name || ''}
        connections={connections}
        userEmail={user?.email}
        submittedByBuyer={false}
        onSuccess={() => {
          queryClient.invalidateQueries(['wsPayments', provider.id]);
          queryClient.invalidateQueries(['wsCreditAccounts', provider.id]);
        }}
      />
    </div>
  );
}