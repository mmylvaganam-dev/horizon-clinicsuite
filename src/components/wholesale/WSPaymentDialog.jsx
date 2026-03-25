import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK = {
  amount: '',
  payment_method: 'cheque',
  payment_date: new Date().toISOString().slice(0, 10),
  reference_number: '',
  cheque_number: '',
  cheque_bank: '',
  cheque_date: new Date().toISOString().slice(0, 10),
  cheque_image_url: '',
  notes: '',
};

export default function WSPaymentDialog({ open, onOpenChange, providerId, companyId, companyName, orderId, orderNumber, userEmail, submittedByBuyer = false, connections = [], onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...BLANK });
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Resolved company id/name — use prop if provided, else from dropdown selection
  const resolvedCompanyId = companyId || selectedCompanyId;
  const resolvedCompanyName = companyName || connections.find(c => c.buyer_company_id === selectedCompanyId)?.buyer_name || '';

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleChequeImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('cheque_image_url', file_url);
      toast.success('Cheque image uploaded');
    } catch {
      toast.error('Upload failed');
    }
    setUploadingImage(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payment = await base44.entities.WholesalePayment.create({
        provider_id: providerId,
        company_id: resolvedCompanyId,
        company_name: resolvedCompanyName,
        order_id: orderId || undefined,
        order_number: orderNumber || undefined,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference_number: form.reference_number || undefined,
        cheque_number: form.payment_method === 'cheque' ? form.cheque_number : undefined,
        cheque_bank: form.payment_method === 'cheque' ? form.cheque_bank : undefined,
        cheque_date: form.payment_method === 'cheque' ? form.cheque_date : undefined,
        cheque_image_url: form.payment_method === 'cheque' ? form.cheque_image_url : undefined,
        cheque_status: form.payment_method === 'cheque' ? 'pending' : undefined,
        notes: form.notes || undefined,
        recorded_by: userEmail,
        submitted_by_buyer: submittedByBuyer,
      });

      // Reduce credit account balance
      if (!submittedByBuyer) {
        const accts = await base44.entities.WholesaleCreditAccount.filter({ provider_id: providerId, company_id: resolvedCompanyId });
        if (accts[0]) {
          const newBal = Math.max(0, (accts[0].current_balance || 0) - Number(form.amount));
          await base44.entities.WholesaleCreditAccount.update(accts[0].id, { current_balance: newBal });
        }
      }
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsPayments', providerId]);
      queryClient.invalidateQueries(['wsCreditAccounts', providerId]);
      queryClient.invalidateQueries(['wsBuyerPayments']);
      toast.success('Payment recorded!');
      setForm({ ...BLANK });
      setSelectedCompanyId('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => toast.error('Failed to record payment'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submittedByBuyer ? 'Submit Payment to Supplier' : 'Record Payment Received'}</DialogTitle>
          {companyName && <p className="text-sm text-slate-500">Buyer: <strong>{companyName}</strong></p>}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Buyer selection (only when not pre-set) */}
          {!companyId && connections.length > 0 && (
            <div>
              <Label>Buyer *</Label>
              <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}>
                <option value="">— Select buyer —</option>
                {connections.map(c => <option key={c.buyer_company_id} value={c.buyer_company_id}>{c.buyer_name}</option>)}
              </select>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (LKR) *</Label>
              <Input type="number" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <Label>Payment Date *</Label>
              <Input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
            </div>
          </div>

          {/* Method */}
          <div>
            <Label>Payment Method *</Label>
            <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="credit_note">Credit Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bank Transfer ref */}
          {form.payment_method === 'bank_transfer' && (
            <div>
              <Label>Bank Reference Number</Label>
              <Input placeholder="e.g. TRF-2024-001234" value={form.reference_number} onChange={e => set('reference_number', e.target.value)} />
            </div>
          )}

          {/* Cheque details */}
          {form.payment_method === 'cheque' && (
            <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm font-bold text-purple-800">Cheque Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cheque Number *</Label>
                  <Input placeholder="e.g. 000123" value={form.cheque_number} onChange={e => set('cheque_number', e.target.value)} />
                </div>
                <div>
                  <Label>Cheque Date</Label>
                  <Input type="date" value={form.cheque_date} onChange={e => set('cheque_date', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input placeholder="e.g. Commercial Bank" value={form.cheque_bank} onChange={e => set('cheque_bank', e.target.value)} />
              </div>

              {/* Cheque image upload */}
              <div>
                <Label>Cheque Image (optional)</Label>
                <div className="mt-1">
                  {form.cheque_image_url ? (
                    <div className="relative">
                      <img src={form.cheque_image_url} alt="Cheque" className="w-full rounded-lg border border-purple-200 max-h-40 object-contain bg-white" />
                      <button onClick={() => set('cheque_image_url', '')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-100 transition">
                      {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin text-purple-500" /> : <><Upload className="w-6 h-6 text-purple-400 mb-1" /><span className="text-xs text-purple-500">Upload cheque photo</span></>}
                      <input type="file" accept="image/*" className="hidden" onChange={handleChequeImageUpload} disabled={uploadingImage} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Input placeholder="Optional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
            onClick={() => saveMutation.mutate()}
            disabled={!form.amount || (!companyId && !selectedCompanyId) || saveMutation.isPending}
          >
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : submittedByBuyer ? '📨 Submit Payment' : '✅ Record Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}