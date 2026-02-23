import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['medicine', 'surgical', 'equipment', 'diagnostic', 'ppe', 'lab_supply', 'hospital_furniture', 'consumable', 'other'];
const EMPTY = { name: '', brand: '', sku: '', category: 'medicine', unit: 'box', unit_price: '', mrp: '', stock_qty: '', min_order_qty: 1, description: '', status: 'active' };

export default function WSProviderProducts({ provider }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: products = [] } = useQuery({
    queryKey: ['wsProducts', provider.id],
    queryFn: () => base44.entities.WholesaleProduct.filter({ provider_id: provider.id }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { ...form, provider_id: provider.id, unit_price: Number(form.unit_price), mrp: Number(form.mrp) || undefined, stock_qty: Number(form.stock_qty) || 0, min_order_qty: Number(form.min_order_qty) || 1 };
      if (editing) return await base44.entities.WholesaleProduct.update(editing.id, data);
      return await base44.entities.WholesaleProduct.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsProducts', provider.id]);
      toast.success(editing ? 'Product updated!' : 'Product added!');
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
  });

  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, brand: p.brand || '', sku: p.sku || '', category: p.category, unit: p.unit, unit_price: p.unit_price, mrp: p.mrp || '', stock_qty: p.stock_qty, min_order_qty: p.min_order_qty || 1, description: p.description || '', status: p.status }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  const statusColor = { active: 'bg-green-100 text-green-700', out_of_stock: 'bg-red-100 text-red-700', discontinued: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No products yet. Add your first product.</p>
          </div>
        ) : filtered.map(p => (
          <Card key={p.id} className="border-2 hover:border-indigo-300 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{p.name}</p>
                  {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                  {p.sku && <p className="text-xs text-slate-400">SKU: {p.sku}</p>}
                </div>
                <button onClick={() => openEdit(p)} className="p-1 text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="font-black text-indigo-700 text-lg">LKR {Number(p.unit_price).toLocaleString()}</p>
                  {p.mrp && <p className="text-xs text-slate-400 line-through">MRP {Number(p.mrp).toLocaleString()}</p>}
                </div>
                <div className="text-right">
                  <Badge className={statusColor[p.status]}>{p.status?.replace('_', ' ')}</Badge>
                  <p className="text-xs text-slate-500 mt-1">Stock: {p.stock_qty}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Brand</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unit Price (LKR) *</Label><Input type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
              <div><Label>MRP (LKR)</Label><Input type="number" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} /></div>
              <div><Label>Unit</Label><Input placeholder="box, strip..." value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stock Qty</Label><Input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} /></div>
              <div><Label>Min Order Qty</Label><Input type="number" value={form.min_order_qty} onChange={e => setForm(f => ({ ...f, min_order_qty: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => saveMutation.mutate()} disabled={!form.name || !form.unit_price || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editing ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}