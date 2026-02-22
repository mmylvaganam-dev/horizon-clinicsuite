import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSPayments() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const blank = { company_id: '', company_name: '', order_id: '', order_number: '', amount: '', payment_method: 'bank_transfer', payment_date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' };
  const [form, setForm] = useState(blank);

  const { data: payments = [] } = useQuery({ queryKey: ['wsPayments'], queryFn: () => base44.entities.WholesalePayment.list('-created_date', 50) });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.CompanyProfile.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['wsOrders'], queryFn: () => base44.entities.WholesaleOrder.list('-created_date', 100) });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, amount: Number(data.amount), recorded_by: user?.email };
      const payment = await base44.entities.WholesalePayment.create(payload);
      // Update credit account balance
      const accounts = await base44.entities.WholesaleCreditAccount.filter({ company_id: data.company_id });
      if (accounts[0]) {
        const newBalance = (accounts[0].current_balance || 0) - Number(data.amount);
        await base44.entities.WholesaleCreditAccount.update(accounts[0].id, { current_balance: Math.max(0, newBalance) });
      }
      return payment;
    },
    onSuccess: () => { queryClient.invalidateQueries(['wsPayments']); queryClient.invalidateQueries(['wsCreditAccounts']); setOpen(false); setForm(blank); toast.success('Payment recorded'); },
  });

  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const methodColors = { cash: 'bg-green-100 text-green-700', bank_transfer: 'bg-blue-100 text-blue-700', cheque: 'bg-purple-100 text-purple-700', credit_note: 'bg-orange-100 text-orange-700' };

  const companyOrders = form.company_id ? orders.filter(o => o.company_id === form.company_id && ['pending', 'delivered', 'shipped'].includes(o.status)) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl px-5 py-3">
          <p className="text-xs text-indigo-500">Total Payments Recorded</p>
          <p className="text-2xl font-black text-indigo-700">LKR {totalCollected.toLocaleString()}</p>
        </div>
        <Button onClick={() => { setForm(blank); setOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Record Payment
        </Button>
      </div>

      <div className="space-y-2">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            No payments recorded yet
          </div>
        ) : payments.map(p => (
          <Card key={p.id} className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{p.company_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={methodColors[p.payment_method] || 'bg-slate-100 text-slate-700'}>{p.payment_method?.replace('_', ' ')}</Badge>
                    {p.order_number && <span className="text-xs text-slate-500">Order: {p.order_number}</span>}
                    {p.reference_number && <span className="text-xs text-slate-400">Ref: {p.reference_number}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(p.payment_date).toLocaleDateString('en-GB')} · by {p.recorded_by}</p>
                </div>
                <p className="font-black text-xl text-green-700">LKR {Number(p.amount).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Company *</Label>
              <Select value={form.company_id} onValueChange={v => { const c = companies.find(co => co.id === v); setForm({...form, company_id: v, company_name: c?.company_legal_name || '', order_id: '', order_number: ''}); }}>
                <SelectTrigger><SelectValue placeholder="Select company..." /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_legal_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {companyOrders.length > 0 && (
              <div><Label>Link to Order (optional)</Label>
                <Select value={form.order_id} onValueChange={v => { const o = orders.find(or => or.id === v); setForm({...form, order_id: v, order_number: o?.order_number || ''}); }}>
                  <SelectTrigger><SelectValue placeholder="Select order..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No specific order</SelectItem>
                    {companyOrders.map(o => <SelectItem key={o.id} value={o.id}>{o.order_number} — LKR {o.total?.toLocaleString()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (LKR) *</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
              <div><Label>Payment Date *</Label><Input type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} /></div>
            </div>
            <div><Label>Method *</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({...form, payment_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference Number</Label><Input value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} placeholder="Cheque no, bank ref..." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => saveMutation.mutate(form)} disabled={!form.company_id || !form.amount || saveMutation.isPending}>Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}