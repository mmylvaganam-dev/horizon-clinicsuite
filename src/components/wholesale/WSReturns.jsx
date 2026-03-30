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
import { Plus, Trash2, RotateCcw, CheckCircle, XCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLOR = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700', rejected: 'bg-red-100 text-red-700', credit_issued: 'bg-green-100 text-green-700' };
const REASONS = ['damaged', 'expired', 'wrong_item', 'excess', 'other'];

export default function WSReturns({ provider }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ buyer_name: '', buyer_organization_id: '', buyer_company_id: '', order_id: '', order_number: '', return_date: new Date().toISOString().slice(0, 10), reason: 'other', reason_notes: '' });
  const [lines, setLines] = useState([{ product_id: '', product_name: '', sku: '', unit: '', qty_returned: '', unit_price: '', condition: 'resaleable' }]);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: products = [] } = useQuery({ queryKey: ['wsProducts', provider.id], queryFn: () => base44.entities.WholesaleProduct.filter({ provider_id: provider.id }) });
  const { data: connections = [] } = useQuery({ queryKey: ['wsConnections', provider.id], queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: provider.id, status: 'active' }) });
  const { data: orders = [] } = useQuery({ queryKey: ['wsOrders', provider.id], queryFn: () => base44.entities.WholesaleOrder.filter({ provider_id: provider.id }, '-created_date', 100) });
  const { data: returns = [] } = useQuery({ queryKey: ['wsReturns', provider.id], queryFn: () => base44.entities.WholesaleReturn.filter({ provider_id: provider.id }, '-created_date', 50) });

  const createMutation = useMutation({
    mutationFn: async () => {
      const validLines = lines.filter(l => l.product_id && l.qty_returned > 0);
      if (validLines.length === 0) throw new Error('Add at least one return line');
      const totalCredit = validLines.reduce((s, l) => s + (Number(l.qty_returned) * Number(l.unit_price || 0)), 0);
      const rtnNum = `RTN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
      const ret = await base44.entities.WholesaleReturn.create({
        provider_id: provider.id,
        return_number: rtnNum,
        order_id: form.order_id || undefined,
        order_number: form.order_number || undefined,
        buyer_company_id: form.buyer_company_id,
        buyer_organization_id: form.buyer_organization_id,
        buyer_name: form.buyer_name,
        return_date: form.return_date,
        reason: form.reason,
        reason_notes: form.reason_notes,
        total_credit: totalCredit,
        status: 'pending',
        processed_by: user?.email,
      });
      await Promise.all(validLines.map(line =>
        base44.entities.WholesaleReturnLine.create({
          return_id: ret.id,
          provider_id: provider.id,
          product_id: line.product_id,
          product_name: line.product_name,
          sku: line.sku,
          unit: line.unit,
          qty_returned: Number(line.qty_returned),
          unit_price: Number(line.unit_price) || 0,
          line_credit: Number(line.qty_returned) * Number(line.unit_price || 0),
          condition: line.condition,
        })
      ));
      return ret;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsReturns', provider.id]);
      toast.success('Return request created!');
      setOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }) => {
      const newStatus = approve ? 'approved' : 'rejected';
      await base44.entities.WholesaleReturn.update(id, { status: newStatus, processed_by: user?.email });
      if (approve) {
        // Restock resaleable items
        await base44.functions.invoke('wholesaleStockUpdate', { action: 'restock_return', return_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsReturns', provider.id]);
      queryClient.invalidateQueries(['wsProducts', provider.id]);
      toast.success('Return processed!');
    },
    onError: (e) => toast.error(e.message),
  });

  const issueCreditMutation = useMutation({
    mutationFn: async (ret) => {
      const creditNum = `CN-${Date.now()}`;
      await base44.entities.WholesaleReturn.update(ret.id, { status: 'credit_issued', credit_note_issued: true, credit_note_number: creditNum });
    },
    onSuccess: () => { queryClient.invalidateQueries(['wsReturns', provider.id]); toast.success('Credit note issued!'); },
  });

  const resetForm = () => {
    setForm({ buyer_name: '', buyer_organization_id: '', buyer_company_id: '', order_id: '', order_number: '', return_date: new Date().toISOString().slice(0, 10), reason: 'other', reason_notes: '' });
    setLines([{ product_id: '', product_name: '', sku: '', unit: '', qty_returned: '', unit_price: '', condition: 'resaleable' }]);
  };

  const selectBuyer = (connId) => {
    const conn = connections.find(c => c.id === connId);
    if (conn) setForm(f => ({ ...f, buyer_name: conn.buyer_name, buyer_organization_id: conn.buyer_organization_id, buyer_company_id: conn.buyer_company_id || '' }));
  };

  const selectProduct = (idx, productId) => {
    const p = products.find(x => x.id === productId);
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, product_id: productId, product_name: p?.name || '', sku: p?.sku || '', unit: p?.unit || '', unit_price: p?.unit_price || '' } : l));
  };

  const updateLine = (idx, field, val) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900">Returns & Credit Notes</h3>
          <p className="text-sm text-slate-500">Manage buyer returns and issue credit notes</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Return
        </Button>
      </div>

      {returns.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
          <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No returns yet</p>
        </div>
      ) : returns.map(ret => (
        <Card key={ret.id} className="border-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900">{ret.return_number}</p>
                  <Badge className={STATUS_COLOR[ret.status]}>{ret.status?.replace('_', ' ')}</Badge>
                  {ret.credit_note_issued && <Badge className="bg-purple-100 text-purple-700">CN: {ret.credit_note_number}</Badge>}
                </div>
                <p className="text-sm text-slate-500 mt-1">{ret.buyer_name} · {ret.return_date} · Reason: {ret.reason?.replace('_', ' ')}</p>
                {ret.reason_notes && <p className="text-xs text-slate-400 italic">{ret.reason_notes}</p>}
                <p className="font-bold text-red-700 mt-1">Credit: LKR {ret.total_credit?.toLocaleString()}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {ret.status === 'pending' && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate({ id: ret.id, approve: true })}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ id: ret.id, approve: false })}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {ret.status === 'approved' && !ret.credit_note_issued && (
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => issueCreditMutation.mutate(ret)}>
                    <FileText className="w-4 h-4 mr-1" /> Issue Credit Note
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Return Request</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Buyer Pharmacy *</Label>
                <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" onChange={e => selectBuyer(e.target.value)}>
                  <option value="">-- Select buyer --</option>
                  {connections.map(c => <option key={c.id} value={c.id}>{c.buyer_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Related Order (optional)</Label>
                <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" onChange={e => {
                  const o = orders.find(x => x.id === e.target.value);
                  setForm(f => ({ ...f, order_id: e.target.value, order_number: o?.order_number || '' }));
                }}>
                  <option value="">-- None --</option>
                  {orders.filter(o => o.status === 'delivered' || o.company_name === form.buyer_name).map(o => (
                    <option key={o.id} value={o.id}>{o.order_number} — {o.company_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Return Date *</Label><Input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} /></div>
              <div>
                <Label>Reason *</Label>
                <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.reason_notes} onChange={e => setForm(f => ({ ...f, reason_notes: e.target.value }))} /></div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-bold">Return Items</Label>
                <Button size="sm" variant="outline" onClick={() => setLines(p => [...p, { product_id: '', product_name: '', sku: '', unit: '', qty_returned: '', unit_price: '', condition: 'resaleable' }])}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 mb-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Product *</Label>
                      <select className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={line.product_id} onChange={e => selectProduct(idx, e.target.value)}>
                        <option value="">-- Select product --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-xs">Qty *</Label><Input type="number" value={line.qty_returned} onChange={e => updateLine(idx, 'qty_returned', e.target.value)} /></div>
                      <div><Label className="text-xs">Unit Price</Label><Input type="number" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></div>
                      <div>
                        <Label className="text-xs">Condition</Label>
                        <select className="w-full border border-slate-200 rounded-lg p-1.5 text-xs" value={line.condition} onChange={e => updateLine(idx, 'condition', e.target.value)}>
                          <option value="resaleable">Resaleable</option>
                          <option value="damaged">Damaged</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {lines.length > 1 && <button onClick={() => setLines(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>}
                </div>
              ))}
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => createMutation.mutate()} disabled={!form.buyer_name || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : '↩️ Create Return Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}