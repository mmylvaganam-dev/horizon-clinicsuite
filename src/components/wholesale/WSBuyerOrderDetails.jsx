import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Truck, Package, ChevronDown, ChevronUp, XCircle, FileText, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800' };
const PAY_COLORS = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', credit: 'bg-blue-100 text-blue-700' };

export default function WSBuyerOrderDetails({ orgId }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [cancelDialogId, setCancelDialogId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: orders = [] } = useQuery({
    queryKey: ['wsMyOrders', orgId],
    queryFn: () => base44.entities.WholesaleOrder.filter({ organization_id: orgId }, '-created_date', 50),
    enabled: !!orgId,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['wsMyOrderItems', orgId],
    queryFn: async () => {
      if (orders.length === 0) return [];
      const orderIds = orders.map(o => o.id);
      // Fetch items for each order
      const results = await Promise.all(orderIds.slice(0, 20).map(id => base44.entities.WholesaleOrderItem.filter({ order_id: id })));
      return results.flat();
    },
    enabled: orders.length > 0,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['wsMyDeliveries', orgId],
    queryFn: async () => {
      if (orders.length === 0) return [];
      const orderIds = orders.map(o => o.id);
      const results = await Promise.all(orderIds.slice(0, 20).map(id => base44.entities.WholesaleDelivery.filter({ order_id: id })));
      return results.flat();
    },
    enabled: orders.length > 0,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId) => {
      await base44.entities.WholesaleOrder.update(orderId, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsMyOrders', orgId]);
      toast.success('Order cancelled');
      setCancelDialogId(null);
    },
  });

  const downloadPDF = (order, items) => {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, W, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order ${order.order_number}`, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 200, 220);
    doc.text(`Supplier: ${order.provider_name}`, 14, 23);
    doc.text(`Date: ${new Date(order.created_date).toLocaleDateString('en-GB')}`, 14, 30);
    doc.text(`Status: ${order.status}  |  Payment: ${order.payment_status}`, W - 14, 23, { align: 'right' });
    let y = 50;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Product', 14, y); doc.text('Qty', 110, y, { align: 'right' }); doc.text('Unit Price', 150, y, { align: 'right' }); doc.text('Total', W - 14, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(200, 210, 220); doc.line(14, y, W - 14, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    items.forEach((item, i) => {
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 1, W - 28, 8, 'F'); }
      doc.text(item.product_name || '', 14, y + 5);
      doc.text(String(item.qty), 110, y + 5, { align: 'right' });
      doc.text(`LKR ${(item.unit_price || 0).toLocaleString()}`, 150, y + 5, { align: 'right' });
      doc.text(`LKR ${(item.line_total || 0).toLocaleString()}`, W - 14, y + 5, { align: 'right' });
      y += 8; if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 4; doc.line(14, y, W - 14, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(`TOTAL: LKR ${order.total?.toLocaleString()}`, W - 14, y, { align: 'right' });
    doc.save(`Order_${order.order_number}.pdf`);
  };

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 items-center flex-wrap">
        {['all', 'pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
            {s}
          </button>
        ))}
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} orders</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No orders found</p>
        </div>
      ) : filtered.map(order => {
        const items = allItems.filter(i => i.order_id === order.id);
        const delivery = deliveries.find(d => d.order_id === order.id);
        const expanded = expandedId === order.id;
        const canCancel = order.status === 'pending';
        return (
          <Card key={order.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : order.id)}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{order.order_number}</p>
                    <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                    <Badge className={PAY_COLORS[order.payment_status]}>{order.payment_status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">From: <strong>{order.provider_name}</strong> · {new Date(order.created_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-indigo-700">LKR {order.total?.toLocaleString()}</p>
                  {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {expanded && (
                <div className="mt-4 border-t pt-4 space-y-4">
                  {/* Order Items */}
                  {items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1"><Package className="w-3 h-3" /> Order Items ({items.length})</p>
                      <div className="border rounded-lg overflow-hidden">
                        {items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm px-3 py-2 border-b border-slate-50 last:border-0 bg-white">
                            <span className="text-slate-800">{item.product_name} × <strong>{item.qty}</strong> {item.unit}</span>
                            <span className="font-semibold text-indigo-700">LKR {item.line_total?.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-3 py-2 bg-indigo-50 font-bold">
                          <span>Total</span>
                          <span className="text-indigo-700">LKR {order.total?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery tracking */}
                  {delivery && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Delivery Tracking</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>Ref: <strong>{delivery.delivery_number}</strong></span>
                        <span className="capitalize">Status: <strong className="text-blue-700">{delivery.status}</strong></span>
                        {delivery.driver_name && <span>Driver: {delivery.driver_name} {delivery.driver_phone && `(${delivery.driver_phone})`}</span>}
                        {delivery.vehicle_number && <span>Vehicle: {delivery.vehicle_number}</span>}
                        {delivery.dispatched_at && <span>Dispatched: {new Date(delivery.dispatched_at).toLocaleString('en-GB')}</span>}
                        {delivery.delivered_at && <span className="text-green-700 font-semibold">Delivered: {new Date(delivery.delivered_at).toLocaleString('en-GB')}</span>}
                      </div>
                      {delivery.proof_of_delivery_url && (
                        <a href={delivery.proof_of_delivery_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 block">📸 View Proof of Delivery</a>
                      )}
                    </div>
                  )}

                  {order.notes && <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2">Note: {order.notes}</p>}

                  <div className="flex gap-2 justify-end flex-wrap">
                    {items.length > 0 && (
                      <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700" onClick={() => downloadPDF(order, items)}>
                        <FileText className="w-3 h-3 mr-1" /> Download PDF
                      </Button>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelDialogId(order.id)}>
                        <XCircle className="w-3 h-3 mr-1" /> Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Cancel Confirmation */}
      <Dialog open={!!cancelDialogId} onOpenChange={() => setCancelDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Order?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Are you sure you want to cancel this order? This cannot be undone.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelDialogId(null)}>Keep Order</Button>
            <Button variant="destructive" className="flex-1" onClick={() => cancelMutation.mutate(cancelDialogId)} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}