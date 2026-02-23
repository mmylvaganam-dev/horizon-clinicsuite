import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSProviderPayments({ provider }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_id: '', company_name: '', order_id: '', order_number: '', amount: '', payment_method: 'cash', payment_date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: payments = [] } = useQuery({
    queryKey: ['wsPayments', provider.id],
    queryFn: () => base44.entities.WholesalePayment.filter({ provider_id: provider.id }, '-created_date', 100),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['wsConnections', provider.id],
    queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: provider.id, status: 'active' }),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['wsOrders', provider.id],
    queryFn: () => base44.entities.WholesaleOrder.filter({ provider_id: provider.id }),
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const payment = await base44.entities.WholesalePayment.create({
        provider_id: provider.id,
        company_id: form.company_id,
        company_name: form.company_name,
        order_id: form.order_id || undefined,
        order_number: form.order_number || undefined,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference_number: form.reference_number,
        notes: form.notes,
        recorded_by: user?.email,
      });
      // Update credit account balance
      const creditAccounts = await base44.entities.WholesaleCreditAccount.filter({ provider_id: provider.id, company_id: form.company_id });
      if (creditAccounts[0]) {
        const newBalance = Math.max(0, (creditAccounts[0].current_balance || 0) - Number(form.amount));
        await base44.entities.WholesaleCreditAccount.update(creditAccounts[0].id, { current_balance: newBalance });
      }
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsPayments', provider.id]);
      queryClient.invalidateQueries(['wsCreditAccounts', provider.id]);
      toast.success('Payment recorded!');
      setOpen(false);
      setForm({ company_id: '', company_name: '', order_id: '', order_number: '', amount: '', payment_method: 'cash', payment_date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' });
    },
  });

  const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const methodColor = { cash: 'bg-green-100 text-green-700', bank_transfer: 'bg-blue-100 text-blue-700', cheque: 'bg-purple-100 text-purple-700', credit_note: 'bg-orange-100 text-orange-700' };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3">
          <p className="text-xs text-green-700 font-medium">Total Collected</p>
          <p className="font-black text-2xl text-green-800">LKR {totalReceived.toLocaleString()}</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Record Payment
        </Button>
      </div>

      <div className="space-y-2">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No payments recorded yet</p></div>
        ) : payments.map(p => (
          <Card key={p.id} className="border border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{p.company_name}</p>
                <p className="text-sm text-slate-500">{p.payment_date} {p.order_number && `· Order: ${p.order_number}`}</p>
                {p.reference_number && <p className="text-xs text-slate-400">Ref: {p.reference_number}</p>}
              </div>
              <div className="text-right">
                <p className="font-black text-green-700 text-lg">LKR {p.amount?.toLocaleString()}</p>
                <Badge className={methodColor[p.payment_method] || 'bg-slate-100 text-slate-600'}>{p.payment_method?.replace('_', ' ')}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment Received</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label>Buyer</Label>
              <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={form.company_id} onChange={e => {
                const conn = connections.find(c => c.buyer_company_id === e.target.value);
                setForm(f => ({ ...f, company_id: e.target.value, company_name: conn?.buyer_name || '' }));
              }}>
                <option value="">-- Select buyer --</option>
                {connections.map(c => <option key={c.buyer_company_id} value={c.buyer_company_id}>{c.buyer_name}</option>)}
              </select>
            </div>
            <div>
              <Label>Related Order (optional)</Label>
              <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={form.order_id} onChange={e => {
                const order = orders.find(o => o.id === e.target.value);
                setForm(f => ({ ...f, order_id: e.target.value, order_number: order?.order_number || '' }));
              }}>
                <option value="">-- None --</option>
                {orders.filter(o => o.company_id === form.company_id).map(o => <option key={o.id} value={o.id}>{o.order_number} · LKR {o.total?.toLocaleString()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (LKR) *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference #</Label><Input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} /></div>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => recordMutation.mutate()} disabled={!form.company_id || !form.amount || recordMutation.isPending}>
              {recordMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}