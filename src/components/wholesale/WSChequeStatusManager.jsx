import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ImageIcon, Clock, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';

const CHEQUE_STATUS_CONFIG = {
  pending:   { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending' },
  deposited: { color: 'bg-blue-100 text-blue-800 border-blue-200',   icon: Banknote, label: 'Deposited' },
  cleared:   { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Cleared' },
  returned:  { color: 'bg-red-100 text-red-800 border-red-200',      icon: XCircle, label: 'Returned' },
};

export default function WSChequeStatusManager({ payment, providerId, onUpdated }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [clearedDate, setClearedDate] = useState(new Date().toISOString().slice(0, 10));

  const updateMutation = useMutation({
    mutationFn: async (newStatus) => {
      const updates = { cheque_status: newStatus };
      if (newStatus === 'cleared') {
        updates.cheque_cleared_date = clearedDate;
        // Now actually apply to credit balance since cheque is confirmed good
        const accts = await base44.entities.WholesaleCreditAccount.filter({ provider_id: providerId, company_id: payment.company_id });
        if (accts[0]) {
          const newBal = Math.max(0, (accts[0].current_balance || 0) - payment.amount);
          await base44.entities.WholesaleCreditAccount.update(accts[0].id, { current_balance: newBal });
        }
      }
      if (newStatus === 'returned') updates.cheque_return_reason = returnReason;
      return base44.entities.WholesalePayment.update(payment.id, updates);
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries(['wsPayments', providerId]);
      queryClient.invalidateQueries(['wsCreditAccounts', providerId]);
      queryClient.invalidateQueries(['wsBuyerPayments']);
      toast.success(`Cheque marked as ${newStatus}`);
      setOpen(false);
      onUpdated?.();
    },
    onError: () => toast.error('Update failed'),
  });

  if (payment.payment_method !== 'cheque') return null;

  const cfg = CHEQUE_STATUS_CONFIG[payment.cheque_status || 'pending'];
  const Icon = cfg.icon;

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5">
        <Badge className={`${cfg.color} border gap-1 cursor-pointer hover:opacity-80`}>
          <Icon className="w-3 h-3" /> {cfg.label}
        </Badge>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Cheque Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-bold text-slate-800">Cheque #{payment.cheque_number}</p>
              {payment.cheque_bank && <p className="text-slate-500">Bank: {payment.cheque_bank}</p>}
              {payment.cheque_date && <p className="text-slate-500">Date: {payment.cheque_date}</p>}
              <p className="font-bold text-indigo-700">LKR {payment.amount?.toLocaleString()}</p>
              {payment.cheque_image_url && (
                <a href={payment.cheque_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-xs mt-1">
                  <ImageIcon className="w-3 h-3" /> View cheque image
                </a>
              )}
            </div>

            {/* Cleared */}
            {payment.cheque_status !== 'cleared' && payment.cheque_status !== 'returned' && (
              <>
                <div>
                  <Label>Cleared Date</Label>
                  <Input type="date" value={clearedDate} onChange={e => setClearedDate(e.target.value)} />
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate('cleared')} disabled={updateMutation.isPending}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark as Cleared
                </Button>
              </>
            )}

            {/* Deposited */}
            {payment.cheque_status === 'pending' && (
              <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => updateMutation.mutate('deposited')} disabled={updateMutation.isPending}>
                <Banknote className="w-4 h-4 mr-2" /> Mark as Deposited
              </Button>
            )}

            {/* Returned */}
            {payment.cheque_status !== 'returned' && payment.cheque_status !== 'cleared' && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div>
                  <Label>Return Reason</Label>
                  <Input placeholder="e.g. Insufficient funds" value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                </div>
                <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50" onClick={() => updateMutation.mutate('returned')} disabled={updateMutation.isPending || !returnReason}>
                  <XCircle className="w-4 h-4 mr-2" /> Mark as Returned
                </Button>
              </div>
            )}

            {(payment.cheque_status === 'cleared' || payment.cheque_status === 'returned') && (
              <div className={`rounded-xl p-3 text-sm font-semibold text-center ${payment.cheque_status === 'cleared' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {payment.cheque_status === 'cleared'
                  ? `✅ Cleared on ${payment.cheque_cleared_date || '—'}`
                  : `❌ Returned: ${payment.cheque_return_reason || '—'}`}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}