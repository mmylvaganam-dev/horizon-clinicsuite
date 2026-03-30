import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, PackageCheck, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_LINE = { product_id: '', product_name: '', sku: '', unit: '', batch_number: '', expiry_date: '', qty_received: '', cost_price: '' };

export default function WSGoodsReceiving({ provider }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ supplier_name: '', supplier_invoice_number: '', received_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const { data: products = [] } = useQuery({
    queryKey: ['wsProducts', provider.id],
    queryFn: () => base44.entities.WholesaleProduct.filter({ provider_id: provider.id }),
  });

  const { data: grns = [] } = useQuery({
    queryKey: ['wsGRNs', provider.id],
    queryFn: () => base44.entities.WholesaleGRN.filter({ provider_id: provider.id }, '-created_date', 50),
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const createGRNMutation = useMutation({
    mutationFn: async () => {
      const validLines = lines.filter(l => l.product_id && l.qty_received > 0);
      if (validLines.length === 0) throw new Error('Add at least one product line');
      const totalCost = validLines.reduce((s, l) => s + (Number(l.qty_received) * Number(l.cost_price || 0)), 0);
      const grnNum = `GRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
      const grn = await base44.entities.WholesaleGRN.create({
        provider_id: provider.id,
        grn_number: grnNum,
        supplier_name: form.supplier_name,
        supplier_invoice_number: form.supplier_invoice_number,
        received_date: form.received_date,
        notes: form.notes,
        status: 'draft',
        total_cost: totalCost,
        received_by: user?.email,
      });
      await Promise.all(validLines.map(line =>
        base44.entities.WholesaleGRNLine.create({
          grn_id: grn.id,
          provider_id: provider.id,
          product_id: line.product_id,
          product_name: line.product_name,
          sku: line.sku,
          unit: line.unit,
          batch_number: line.batch_number,
          expiry_date: line.expiry_date || undefined,
          qty_received: Number(line.qty_received),
          cost_price: Number(line.cost_price) || 0,
          line_total: Number(line.qty_received) * Number(line.cost_price || 0),
        })
      ));
      return grn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsGRNs', provider.id]);
      toast.success('GRN created! Review and post to update stock.');
      setOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const postGRNMutation = useMutation({
    mutationFn: async (grnId) => {
      const res = await base44.functions.invoke('wholesaleStockUpdate', { action: 'post_grn', grn_id: grnId });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['wsGRNs', provider.id]);
      queryClient.invalidateQueries(['wsProducts', provider.id]);
      toast.success(data.message || 'Stock updated!');
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ supplier_name: '', supplier_invoice_number: '', received_date: new Date().toISOString().slice(0, 10), notes: '' });
    setLines([{ ...EMPTY_LINE }]);
  };

  const selectProduct = (idx, productId) => {
    const p = products.find(x => x.id === productId);
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, product_id: productId, product_name: p?.name || '', sku: p?.sku || '', unit: p?.unit || '' } : l));
  };

  const updateLine = (idx, field, value) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const addLine = () => setLines(prev => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const statusColor = { draft: 'bg-yellow-100 text-yellow-700', posted: 'bg-green-100 text-green-700' };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900">Goods Receiving (GRN)</h3>
          <p className="text-sm text-slate-500">Record stock received from manufacturers/importers</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New GRN
        </Button>
      </div>

      {grns.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
          <PackageCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No goods receipts yet. Create your first GRN to track incoming stock.</p>
        </div>
      ) : grns.map(grn => {
        const expanded = expandedId === grn.id;
        return (
          <Card key={grn.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : grn.id)}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{grn.grn_number}</p>
                    <Badge className={statusColor[grn.status]}>{grn.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {grn.supplier_name && `From: ${grn.supplier_name} · `}
                    {grn.received_date} {grn.supplier_invoice_number && `· Inv: ${grn.supplier_invoice_number}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {grn.total_cost > 0 && <p className="font-bold text-indigo-700">LKR {grn.total_cost?.toLocaleString()}</p>}
                  {grn.status === 'draft' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); postGRNMutation.mutate(grn.id); }} disabled={postGRNMutation.isPending}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Post to Stock
                    </Button>
                  )}
                  {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              {expanded && <GRNLines grnId={grn.id} />}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Goods Receipt (GRN)</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Supplier / Manufacturer Name</Label><Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder="e.g. ABC Pharma Ltd" /></div>
              <div><Label>Supplier Invoice #</Label><Input value={form.supplier_invoice_number} onChange={e => setForm(f => ({ ...f, supplier_invoice_number: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Received Date *</Label><Input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-bold">Products Received</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
              </div>
              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Line {idx + 1}</span>
                      {lines.length > 1 && <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Product *</Label>
                        <select className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={line.product_id} onChange={e => selectProduct(idx, e.target.value)}>
                          <option value="">-- Select product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">Qty Received *</Label><Input type="number" value={line.qty_received} onChange={e => updateLine(idx, 'qty_received', e.target.value)} /></div>
                        <div><Label className="text-xs">Cost Price</Label><Input type="number" value={line.cost_price} onChange={e => updateLine(idx, 'cost_price', e.target.value)} placeholder="LKR" /></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-xs">Batch Number</Label><Input value={line.batch_number} onChange={e => updateLine(idx, 'batch_number', e.target.value)} /></div>
                      <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={line.expiry_date} onChange={e => updateLine(idx, 'expiry_date', e.target.value)} /></div>
                      <div><Label className="text-xs">Unit</Label><Input value={line.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} placeholder="box, strip..." /></div>
                    </div>
                    {line.qty_received && line.cost_price && (
                      <p className="text-xs text-indigo-700 font-semibold">Line Total: LKR {(Number(line.qty_received) * Number(line.cost_price)).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => createGRNMutation.mutate()} disabled={createGRNMutation.isPending}>
              {createGRNMutation.isPending ? 'Creating...' : '📦 Create GRN (Save as Draft)'}
            </Button>
            <p className="text-xs text-slate-500 text-center">GRN will be saved as Draft. Review then click "Post to Stock" to update inventory.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GRNLines({ grnId }) {
  const { data: lines = [] } = useQuery({
    queryKey: ['wsGRNLines', grnId],
    queryFn: () => base44.entities.WholesaleGRNLine.filter({ grn_id: grnId }),
  });
  if (lines.length === 0) return <p className="text-sm text-slate-400 mt-3">No lines found.</p>;
  return (
    <div className="mt-4 border-t pt-3 space-y-1">
      {lines.map(l => (
        <div key={l.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
          <div>
            <span className="font-medium text-slate-800">{l.product_name}</span>
            {l.batch_number && <span className="text-xs text-slate-400 ml-2">Batch: {l.batch_number}</span>}
            {l.expiry_date && <span className="text-xs text-slate-400 ml-2">Exp: {l.expiry_date}</span>}
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-700">{l.qty_received} {l.unit}</span>
            {l.cost_price > 0 && <span className="text-xs text-indigo-600 ml-2">@ LKR {l.cost_price}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}