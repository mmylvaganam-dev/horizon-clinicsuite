import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Tag, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const dealTypeOptions = [
  { value: 'buy_x_get_y_free', label: 'Buy X Get Y Free' },
  { value: 'bulk_discount', label: 'Bulk Discount' },
  { value: 'flat_discount', label: 'Flat Discount' },
  { value: 'seasonal_offer', label: 'Seasonal Offer' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'special_pricing', label: 'Special Pricing' },
];

export default function DealsManagerTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    supplier_name: '', drug_name: '', generic_name: '', sku_code: '',
    deal_type: 'buy_x_get_y_free', deal_label: '', deal_description: '',
    buy_qty: '', free_qty: '0', discount_pct: '0', special_price: '',
    list_unit_price: '', currency: 'LKR', start_date: new Date().toISOString().slice(0, 10),
    end_date: '', is_active: true, min_order_qty: '1', region: '', notes: '',
  });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['procurementDeals'],
    queryFn: () => base44.entities.ProcurementDeal.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.ProcurementDeal.update(editing.id, data);
      return base44.entities.ProcurementDeal.create(data);
    },
    onSuccess: () => {
      toast.success(editing ? 'Deal updated' : 'Deal created');
      queryClient.invalidateQueries({ queryKey: ['procurementDeals'] });
      setShowDialog(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProcurementDeal.delete(id),
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['procurementDeals'] });
    },
  });

  const filtered = deals.filter(d =>
    (d.supplier_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.drug_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.generic_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    if (!form.supplier_name || !form.drug_name || !form.deal_label) {
      toast.error('Supplier, drug name, and deal label are required');
      return;
    }
    saveMutation.mutate({
      ...form,
      buy_qty: form.buy_qty ? parseInt(form.buy_qty) : null,
      free_qty: parseInt(form.free_qty) || 0,
      discount_pct: parseFloat(form.discount_pct) || 0,
      special_price: form.special_price ? parseFloat(form.special_price) : null,
      list_unit_price: form.list_unit_price ? parseFloat(form.list_unit_price) : null,
      min_order_qty: parseInt(form.min_order_qty) || 1,
    });
  };

  const openEdit = (deal) => {
    setEditing(deal);
    setForm({
      supplier_name: deal.supplier_name || '', drug_name: deal.drug_name || '',
      generic_name: deal.generic_name || '', sku_code: deal.sku_code || '',
      deal_type: deal.deal_type || 'buy_x_get_y_free', deal_label: deal.deal_label || '',
      deal_description: deal.deal_description || '', buy_qty: deal.buy_qty?.toString() || '',
      free_qty: (deal.free_qty || 0).toString(), discount_pct: (deal.discount_pct || 0).toString(),
      special_price: deal.special_price?.toString() || '', list_unit_price: deal.list_unit_price?.toString() || '',
      currency: deal.currency || 'LKR', start_date: deal.start_date || new Date().toISOString().slice(0, 10),
      end_date: deal.end_date || '', is_active: deal.is_active !== false,
      min_order_qty: (deal.min_order_qty || 1).toString(), region: deal.region || '', notes: deal.notes || '',
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Supplier Deal Presets</h2>
          <p className="text-sm text-slate-500">Pre-configure deals (buy 5 get 1 free, bulk discounts, etc.) for quick selection at stock receipt</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Deal
        </Button>
      </div>

      <div className="relative w-64">
        <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
        <Input placeholder="Search by supplier, drug..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((deal) => (
          <Card key={deal.id} className={!deal.is_active ? 'opacity-60' : ''}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <Badge className="bg-purple-100 text-purple-700">{dealTypeOptions.find(o => o.value === deal.deal_type)?.label || deal.deal_type}</Badge>
                {deal.is_active ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
              </div>
              <h3 className="font-semibold text-slate-900">{deal.deal_label}</h3>
              <p className="text-sm text-slate-600 mt-1">{deal.drug_name}</p>
              <p className="text-xs text-slate-400 mt-1">{deal.supplier_name}</p>
              {deal.deal_description && <p className="text-xs text-slate-500 mt-2">{deal.deal_description}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                {deal.start_date && <span>From: {deal.start_date}</span>}
                {deal.end_date && <span>Until: {deal.end_date}</span>}
              </div>
              <div className="flex gap-1 mt-3">
                <Button variant="outline" size="sm" className="h-7" onClick={() => openEdit(deal)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                <Button variant="ghost" size="sm" className="h-7 text-red-500" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(deal.id); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-slate-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{isLoading ? 'Loading...' : 'No deals configured yet.'}</p>
              <p className="text-xs mt-1">Add preset deals like "Buy 5 boxes get 1 free" for quick selection when receiving stock.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Deal' : 'Add Supplier Deal'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supplier Name *</Label><Input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} placeholder="e.g., Premier Wholesale" /></div>
            <div><Label>Drug Name *</Label><Input value={form.drug_name} onChange={e => setForm({...form, drug_name: e.target.value})} placeholder="e.g., Paracetamol 500mg" /></div>
            <div><Label>Generic Name</Label><Input value={form.generic_name} onChange={e => setForm({...form, generic_name: e.target.value})} placeholder="e.g., Paracetamol" /></div>
            <div><Label>SKU Code</Label><Input value={form.sku_code} onChange={e => setForm({...form, sku_code: e.target.value})} /></div>
            <div><Label>Deal Type *</Label><Select value={form.deal_type} onValueChange={v => setForm({...form, deal_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dealTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Deal Label *</Label><Input value={form.deal_label} onChange={e => setForm({...form, deal_label: e.target.value})} placeholder="e.g., Buy 5 Get 1 Free" /></div>
            <div className="col-span-2"><Label>Deal Description</Label><Input value={form.deal_description} onChange={e => setForm({...form, deal_description: e.target.value})} placeholder="Full terms, e.g., Buy 5 boxes of 100s, get 1 box free. Valid for Q3 2025." /></div>
            <div><Label>Buy Qty</Label><Input type="number" value={form.buy_qty} onChange={e => setForm({...form, buy_qty: e.target.value})} placeholder="e.g., 5" /></div>
            <div><Label>Free Qty</Label><Input type="number" value={form.free_qty} onChange={e => setForm({...form, free_qty: e.target.value})} placeholder="e.g., 1" /></div>
            <div><Label>Discount %</Label><Input type="number" value={form.discount_pct} onChange={e => setForm({...form, discount_pct: e.target.value})} placeholder="e.g., 10" /></div>
            <div><Label>Special Price</Label><Input type="number" value={form.special_price} onChange={e => setForm({...form, special_price: e.target.value})} /></div>
            <div><Label>List Unit Price</Label><Input type="number" value={form.list_unit_price} onChange={e => setForm({...form, list_unit_price: e.target.value})} /></div>
            <div><Label>Min Order Qty</Label><Input type="number" value={form.min_order_qty} onChange={e => setForm({...form, min_order_qty: e.target.value})} /></div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
            <div><Label>Region</Label><Input value={form.region} onChange={e => setForm({...form, region: e.target.value})} placeholder="Nationwide, Colombo..." /></div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save Deal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}