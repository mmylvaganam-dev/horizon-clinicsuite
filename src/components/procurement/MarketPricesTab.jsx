import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Globe, Plus, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MarketPricesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    generic_name: '', drug_name: '', strength: '', dosage_form: '',
    market_name: '', supplier_name: '', unit_price: '', unit: 'box',
    pack_size: '', min_order_qty: '1', currency: 'LKR', deal_terms: '',
    effective_price_after_deal: '', region: '', category: 'local_wholesale',
    effective_date: new Date().toISOString().slice(0, 10), valid_until: '',
    notes: '',
  });

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['wholesaleMarketPrices'],
    queryFn: () => base44.entities.WholesaleMarketPrice.list('-effective_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        return base44.entities.WholesaleMarketPrice.update(editing.id, data);
      }
      return base44.entities.WholesaleMarketPrice.create(data);
    },
    onSuccess: () => {
      toast.success(editing ? 'Market price updated' : 'Market price added');
      queryClient.invalidateQueries({ queryKey: ['wholesaleMarketPrices'] });
      setShowDialog(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WholesaleMarketPrice.delete(id),
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['wholesaleMarketPrices'] });
    },
  });

  const filtered = prices.filter(p =>
    (p.generic_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.market_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    if (!form.generic_name || !form.market_name || !form.unit_price) {
      toast.error('Generic name, market name, and unit price are required');
      return;
    }
    saveMutation.mutate({
      ...form,
      unit_price: parseFloat(form.unit_price),
      pack_size: form.pack_size ? parseInt(form.pack_size) : null,
      min_order_qty: parseInt(form.min_order_qty) || 1,
      effective_price_after_deal: form.effective_price_after_deal ? parseFloat(form.effective_price_after_deal) : null,
      is_current: true,
      recorded_by: 'platform',
    });
  };

  const openEdit = (price) => {
    setEditing(price);
    setForm({
      generic_name: price.generic_name || '', drug_name: price.drug_name || '',
      strength: price.strength || '', dosage_form: price.dosage_form || '',
      market_name: price.market_name || '', supplier_name: price.supplier_name || '',
      unit_price: price.unit_price?.toString() || '', unit: price.unit || 'box',
      pack_size: price.pack_size?.toString() || '', min_order_qty: (price.min_order_qty || 1).toString(),
      currency: price.currency || 'LKR', deal_terms: price.deal_terms || '',
      effective_price_after_deal: price.effective_price_after_deal?.toString() || '',
      region: price.region || '', category: price.category || 'local_wholesale',
      effective_date: price.effective_date || new Date().toISOString().slice(0, 10),
      valid_until: price.valid_until || '', notes: price.notes || '',
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Wholesale Market Price Benchmarks</h2>
          <p className="text-sm text-slate-500">Preset market prices for comparison — local wholesalers, importers, and global suppliers</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ ...form, effective_date: new Date().toISOString().slice(0, 10) }); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Price
        </Button>
      </div>

      <div className="relative w-64">
        <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
        <Input placeholder="Search by medicine, market, supplier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              {isLoading ? 'Loading...' : 'No market prices recorded yet. Add price benchmarks to compare suppliers.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="text-left p-2">Generic Name</th>
                    <th className="text-left p-2">Strength</th>
                    <th className="text-left p-2">Market / Supplier</th>
                    <th className="text-left p-2">Region</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-left p-2">Deal Terms</th>
                    <th className="text-right p-2">Eff. Price</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-2 font-medium">{p.generic_name}</td>
                      <td className="p-2 text-xs">{p.strength || '-'} {p.dosage_form || ''}</td>
                      <td className="p-2">
                        <div className="font-medium">{p.market_name}</div>
                        {p.supplier_name && <div className="text-xs text-slate-400">{p.supplier_name}</div>}
                      </td>
                      <td className="p-2 text-xs">{p.region || '-'}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {p.category?.replace(/_/g, ' ') || '-'}
                        </Badge>
                      </td>
                      <td className="text-right p-2 font-medium">{p.currency} {p.unit_price?.toFixed(2)}</td>
                      <td className="p-2 text-xs text-purple-600">{p.deal_terms || '-'}</td>
                      <td className="text-right p-2 text-teal-600">{p.effective_price_after_deal ? `${p.currency} ${p.effective_price_after_deal.toFixed(2)}` : '-'}</td>
                      <td className="text-center p-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(p.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Market Price' : 'Add Market Price Benchmark'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Generic Name *</Label><Input value={form.generic_name} onChange={e => setForm({...form, generic_name: e.target.value})} placeholder="e.g., Paracetamol" /></div>
            <div><Label>Brand/Product Name</Label><Input value={form.drug_name} onChange={e => setForm({...form, drug_name: e.target.value})} /></div>
            <div><Label>Strength</Label><Input value={form.strength} onChange={e => setForm({...form, strength: e.target.value})} placeholder="e.g., 500mg" /></div>
            <div><Label>Dosage Form</Label><Input value={form.dosage_form} onChange={e => setForm({...form, dosage_form: e.target.value})} placeholder="Tablet, Syrup..." /></div>
            <div><Label>Market Name *</Label><Input value={form.market_name} onChange={e => setForm({...form, market_name: e.target.value})} placeholder="e.g., Colombo Wholesale" /></div>
            <div><Label>Supplier Name</Label><Input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} /></div>
            <div><Label>Unit Price *</Label><Input type="number" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})} /></div>
            <div><Label>Currency</Label><Select value={form.currency} onValueChange={v => setForm({...form, currency: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LKR">LKR</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="INR">INR</SelectItem></SelectContent></Select></div>
            <div><Label>Unit</Label><Select value={form.unit} onValueChange={v => setForm({...form, unit: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="box">Box</SelectItem><SelectItem value="strip">Strip</SelectItem><SelectItem value="tablet">Tablet</SelectItem><SelectItem value="vial">Vial</SelectItem></SelectContent></Select></div>
            <div><Label>Pack Size</Label><Input type="number" value={form.pack_size} onChange={e => setForm({...form, pack_size: e.target.value})} placeholder="e.g., 100" /></div>
            <div><Label>Min Order Qty</Label><Input type="number" value={form.min_order_qty} onChange={e => setForm({...form, min_order_qty: e.target.value})} /></div>
            <div><Label>Region</Label><Input value={form.region} onChange={e => setForm({...form, region: e.target.value})} placeholder="Local, India, China..." /></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({...form, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="local_wholesale">Local Wholesale</SelectItem><SelectItem value="importer">Importer</SelectItem><SelectItem value="manufacturer_direct">Manufacturer Direct</SelectItem><SelectItem value="global_supplier">Global Supplier</SelectItem></SelectContent></Select></div>
            <div className="col-span-2"><Label>Deal Terms</Label><Input value={form.deal_terms} onChange={e => setForm({...form, deal_terms: e.target.value})} placeholder="e.g., Buy 50 boxes get 5 free" /></div>
            <div><Label>Effective Price After Deal</Label><Input type="number" value={form.effective_price_after_deal} onChange={e => setForm({...form, effective_price_after_deal: e.target.value})} /></div>
            <div><Label>Effective Date *</Label><Input type="date" value={form.effective_date} onChange={e => setForm({...form, effective_date: e.target.value})} /></div>
            <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}