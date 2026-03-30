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
import { Truck, Plus, MapPin, CheckCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLOR = { preparing: 'bg-yellow-100 text-yellow-700', dispatched: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700' };

export default function WSDeliveryManager({ provider }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [form, setForm] = useState({ order_id: '', driver_name: '', driver_phone: '', vehicle_number: '', delivery_address: '', notes: '' });
  const [updateForm, setUpdateForm] = useState({ status: '', recipient_name: '', delivered_at: '', proof_file: null });
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: orders = [] } = useQuery({
    queryKey: ['wsOrders', provider.id],
    queryFn: () => base44.entities.WholesaleOrder.filter({ provider_id: provider.id }, '-created_date', 100),
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ['wsDeliveries', provider.id],
    queryFn: () => base44.entities.WholesaleDelivery.filter({ provider_id: provider.id }, '-created_date', 100),
  });

  // Orders that have been approved/processing but no delivery created yet
  const ordersWithoutDelivery = orders.filter(o =>
    (o.status === 'approved' || o.status === 'processing') &&
    !deliveries.find(d => d.order_id === o.id)
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.order_id) throw new Error('Select an order');
      const order = orders.find(o => o.id === form.order_id);
      const delNum = `DEL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
      const delivery = await base44.entities.WholesaleDelivery.create({
        provider_id: provider.id,
        order_id: form.order_id,
        order_number: order?.order_number || '',
        buyer_name: order?.company_name || '',
        delivery_number: delNum,
        driver_name: form.driver_name,
        driver_phone: form.driver_phone,
        vehicle_number: form.vehicle_number,
        delivery_address: form.delivery_address || order?.delivery_address || '',
        status: 'dispatched',
        dispatched_at: new Date().toISOString(),
        dispatched_by: user?.email,
        notes: form.notes,
      });
      // Update order status to shipped
      await base44.entities.WholesaleOrder.update(form.order_id, { status: 'shipped' });
      return delivery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsDeliveries', provider.id]);
      queryClient.invalidateQueries(['wsOrders', provider.id]);
      toast.success('Delivery dispatched!');
      setOpen(false);
      setForm({ order_id: '', driver_name: '', driver_phone: '', vehicle_number: '', delivery_address: '', notes: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        status: updateForm.status,
        recipient_name: updateForm.recipient_name,
      };
      if (updateForm.status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }
      if (updateForm.proof_file_url) {
        updates.proof_of_delivery_url = updateForm.proof_file_url;
      }
      await base44.entities.WholesaleDelivery.update(selectedDelivery.id, updates);
      // If delivered, update order status
      if (updateForm.status === 'delivered') {
        await base44.entities.WholesaleOrder.update(selectedDelivery.order_id, { status: 'delivered', actual_delivery_date: new Date().toISOString().slice(0, 10) });
        // Auto-deduct stock
        await base44.functions.invoke('wholesaleStockUpdate', { action: 'deduct_order', order_id: selectedDelivery.order_id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsDeliveries', provider.id]);
      queryClient.invalidateQueries(['wsOrders', provider.id]);
      queryClient.invalidateQueries(['wsProducts', provider.id]);
      toast.success('Delivery updated!');
      setUpdateOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUpdateForm(f => ({ ...f, proof_file_url: file_url }));
    setUploading(false);
    toast.success('Photo uploaded!');
  };

  const openUpdate = (delivery) => {
    setSelectedDelivery(delivery);
    setUpdateForm({ status: delivery.status, recipient_name: delivery.recipient_name || '', proof_file_url: delivery.proof_of_delivery_url || '' });
    setUpdateOpen(true);
  };

  const filtered = statusFilter === 'all' ? deliveries : deliveries.filter(d => d.status === statusFilter);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-slate-900">Delivery Management</h3>
          <p className="text-sm text-slate-500">Dispatch orders, track drivers, capture proof of delivery</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {['preparing', 'dispatched', 'delivered', 'failed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)} disabled={ordersWithoutDelivery.length === 0}>
            <Truck className="w-4 h-4 mr-2" /> Dispatch Order
          </Button>
        </div>
      </div>

      {ordersWithoutDelivery.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-yellow-800">⏳ {ordersWithoutDelivery.length} approved order(s) awaiting dispatch</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No deliveries yet</p>
        </div>
      ) : filtered.map(del => (
        <Card key={del.id} className="border-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900">{del.delivery_number}</p>
                  <Badge className={STATUS_COLOR[del.status]}>{del.status}</Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">Order: <strong>{del.order_number}</strong> → {del.buyer_name}</p>
                {del.driver_name && <p className="text-xs text-slate-400">Driver: {del.driver_name} {del.driver_phone && `· ${del.driver_phone}`} {del.vehicle_number && `· ${del.vehicle_number}`}</p>}
                {del.delivery_address && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {del.delivery_address}</p>}
                {del.dispatched_at && <p className="text-xs text-slate-400">Dispatched: {new Date(del.dispatched_at).toLocaleString('en-GB')}</p>}
                {del.delivered_at && <p className="text-xs text-green-600">Delivered: {new Date(del.delivered_at).toLocaleString('en-GB')} {del.recipient_name && `· Received by: ${del.recipient_name}`}</p>}
                {del.proof_of_delivery_url && (
                  <a href={del.proof_of_delivery_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                    <Camera className="w-3 h-3" /> View Proof of Delivery
                  </a>
                )}
              </div>
              {del.status !== 'delivered' && del.status !== 'failed' && (
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700" onClick={() => openUpdate(del)}>
                  Update Status
                </Button>
              )}
              {del.status === 'delivered' && <CheckCircle className="w-6 h-6 text-green-500" />}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dispatch Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Dispatch Order</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label>Order to Dispatch *</Label>
              <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}>
                <option value="">-- Select approved order --</option>
                {ordersWithoutDelivery.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.company_name} (LKR {o.total?.toLocaleString()})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} /></div>
              <div><Label>Driver Phone</Label><Input value={form.driver_phone} onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))} /></div>
            </div>
            <div><Label>Vehicle Number</Label><Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="e.g. WP CAB 1234" /></div>
            <div><Label>Delivery Address</Label><Input value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => createMutation.mutate()} disabled={!form.order_id || createMutation.isPending}>
              {createMutation.isPending ? 'Dispatching...' : '🚚 Dispatch Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update Delivery — {selectedDelivery?.delivery_number}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label>New Status</Label>
              <Select value={updateForm.status} onValueChange={v => setUpdateForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['preparing', 'dispatched', 'delivered', 'failed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {updateForm.status === 'delivered' && (
              <>
                <div><Label>Recipient Name</Label><Input value={updateForm.recipient_name} onChange={e => setUpdateForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="Who received the goods?" /></div>
                <div>
                  <Label>Proof of Delivery Photo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="file" accept="image/*" onChange={handleProofUpload} className="text-sm" />
                    {uploading && <span className="text-xs text-indigo-600">Uploading...</span>}
                    {updateForm.proof_file_url && <span className="text-xs text-green-600">✓ Uploaded</span>}
                  </div>
                </div>
              </>
            )}
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Delivery'}
            </Button>
            {updateForm.status === 'delivered' && (
              <p className="text-xs text-slate-500 text-center">⚡ Marking as delivered will automatically deduct this order's items from stock inventory</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}