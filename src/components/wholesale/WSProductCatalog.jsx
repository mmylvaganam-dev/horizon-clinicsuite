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
import { Plus, Edit, Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['medicine', 'surgical', 'equipment', 'diagnostic', 'ppe', 'lab_supply', 'hospital_furniture', 'consumable', 'other'];

export default function WSProductCatalog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const blank = { name: '', brand: '', sku: '', category: 'medicine', description: '', unit: 'box', unit_price: '', mrp: '', min_order_qty: 1, stock_qty: 0, status: 'active' };
  const [form, setForm] = useState(blank);

  const { data: products = [] } = useQuery({ queryKey: ['wholesaleProducts'], queryFn: () => base44.entities.WholesaleProduct.list('-created_date') });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, unit_price: Number(data.unit_price), mrp: Number(data.mrp) || null, min_order_qty: Number(data.min_order_qty), stock_qty: Number(data.stock_qty) };
      return editing ? base44.entities.WholesaleProduct.update(editing.id, payload) : base44.entities.WholesaleProduct.create(payload);
    },
    onSuccess: () => { queryClient.invalidateQueries(['wholesaleProducts']); setOpen(false); setEditing(null); setForm(blank); toast.success('Product saved'); },
  });

  const filtered = products.filter(p => {
    const matchCat = filterCat === 'all' || p.category === filterCat;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, brand: p.brand || '', sku: p.sku || '', category: p.category, description: p.description || '', unit: p.unit, unit_price: p.unit_price, mrp: p.mrp || '', min_order_qty: p.min_order_qty || 1, stock_qty: p.stock_qty || 0, status: p.status }); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setForm(blank); setOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(p => (
          <Card key={p.id} className="border-2 hover:border-indigo-300 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                  {p.sku && <p className="text-xs text-slate-400">SKU: {p.sku}</p>}
                  <Badge variant="outline" className="mt-1 text-xs capitalize">{p.category?.replace('_', ' ')}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xl font-black text-indigo-700">LKR {Number(p.unit_price).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">per {p.unit}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${(p.stock_qty || 0) <= 10 ? 'text-red-600' : 'text-green-600'}`}>{p.stock_qty ?? 0} in stock</p>
                  <Badge className={p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>{p.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            No products found. Add your first product.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Product Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Product name" /></div>
              <div><Label>Brand</Label><Input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Manufacturer" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU / Code</Label><Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></div>
              <div><Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unit *</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="box, strip, piece" /></div>
              <div><Label>Wholesale Price *</Label><Input type="number" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})} placeholder="LKR" /></div>
              <div><Label>MRP</Label><Input type="number" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})} placeholder="LKR" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stock Qty</Label><Input type="number" value={form.stock_qty} onChange={e => setForm({...form, stock_qty: e.target.value})} /></div>
              <div><Label>Min Order Qty</Label><Input type="number" value={form.min_order_qty} onChange={e => setForm({...form, min_order_qty: e.target.value})} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional" /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.unit_price || saveMutation.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}