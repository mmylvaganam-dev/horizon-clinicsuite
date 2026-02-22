import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Eye, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'];
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-700', rejected: 'bg-red-100 text-red-700' };

export default function WSOrders() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data: orders = [] } = useQuery({ queryKey: ['wsOrders'], queryFn: () => base44.entities.WholesaleOrder.list('-created_date', 100) });
  const { data: orderItems = [] } = useQuery({ queryKey: ['wsOrderItems'], queryFn: () => base44.entities.WholesaleOrderItem.list() });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, status, notes }) => base44.entities.WholesaleOrder.update(orderId, { status, admin_notes: notes }),
    onSuccess: () => { queryClient.invalidateQueries(['wsOrders']); setSelectedOrder(null); toast.success('Order updated'); },
  });

  const filtered = orders.filter(o => filterStatus === 'all' || o.status === filterStatus);
  const getItems = (orderId) => orderItems.filter(i => i.order_id === orderId);

  const openOrder = (order) => { setSelectedOrder(order); setNewStatus(order.status); setAdminNotes(order.admin_notes || ''); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">{filtered.length} orders</p>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            No orders found
          </div>
        ) : filtered.map(order => (
          <Card key={order.id} className="border-2 hover:border-indigo-200 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{order.order_number}</p>
                    <Badge className={STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}>{order.status}</Badge>
                    <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>{order.payment_status}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{order.company_name} · Ordered {new Date(order.created_date).toLocaleDateString('en-GB')}</p>
                  {order.ordered_by && <p className="text-xs text-slate-400">by {order.ordered_by}</p>}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-black text-xl text-indigo-700">LKR {order.total?.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{getItems(order.id).length} item(s)</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openOrder(order)}>
                    <Eye className="w-4 h-4 mr-1" /> Manage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order: {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Company</p><p className="font-bold">{selectedOrder.company_name}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Ordered By</p><p className="font-bold">{selectedOrder.ordered_by}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Total</p><p className="font-black text-indigo-700">LKR {selectedOrder.total?.toLocaleString()}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Payment</p><Badge className={selectedOrder.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>{selectedOrder.payment_status}</Badge></div>
              </div>

              {selectedOrder.notes && <div className="bg-blue-50 rounded-lg p-3 text-sm"><p className="text-xs text-blue-500 mb-1">Buyer Notes</p><p>{selectedOrder.notes}</p></div>}

              {/* Items */}
              <div>
                <p className="font-semibold text-slate-700 mb-2">Order Items</p>
                <div className="space-y-2">
                  {getItems(selectedOrder.id).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-slate-500">{item.qty} × LKR {item.unit_price?.toLocaleString()} per {item.unit}</p>
                      </div>
                      <p className="font-bold text-indigo-700">LKR {item.line_total?.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Status */}
              <div className="space-y-2 border-t pt-4">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
                <Label>Admin Notes</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => updateMutation.mutate({ orderId: selectedOrder.id, status: newStatus, notes: adminNotes })} disabled={updateMutation.isPending}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}