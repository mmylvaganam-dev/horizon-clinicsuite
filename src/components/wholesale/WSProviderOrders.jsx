import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, ShoppingCart, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800' };
const PAY_COLORS = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', credit: 'bg-blue-100 text-blue-700' };

export default function WSProviderOrders({ provider }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: orders = [] } = useQuery({
    queryKey: ['wsOrders', provider.id],
    queryFn: () => base44.entities.WholesaleOrder.filter({ provider_id: provider.id }, '-created_date', 100),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['wsOrderItems', provider.id],
    queryFn: () => base44.entities.WholesaleOrderItem.filter({ provider_id: provider.id }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, payment_status, admin_notes }) => {
      return await base44.entities.WholesaleOrder.update(id, { status, payment_status, admin_notes });
    },
    onSuccess: () => { queryClient.invalidateQueries(['wsOrders', provider.id]); toast.success('Order updated!'); },
  });

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-slate-500 flex items-center">{filtered.length} orders</div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No orders found</p>
        </div>
      ) : filtered.map(order => {
        const items = allItems.filter(i => i.order_id === order.id);
        const expanded = expandedId === order.id;
        return (
          <Card key={order.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : order.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{order.order_number}</p>
                    <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                    <Badge className={PAY_COLORS[order.payment_status]}>{order.payment_status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{order.company_name} · {new Date(order.created_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-indigo-700">LKR {order.total?.toLocaleString()}</p>
                  {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {expanded && (
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                  {items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Items:</p>
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm py-1 border-b border-slate-50">
                          <span>{item.product_name} × {item.qty} {item.unit}</span>
                          <span className="font-semibold text-indigo-700">LKR {item.line_total?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {order.notes && <p className="text-xs text-slate-500 italic">Note: {order.notes}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Update Status</p>
                      <Select defaultValue={order.status} onValueChange={v => updateMutation.mutate({ id: order.id, status: v, payment_status: order.payment_status })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Payment Status</p>
                      <Select defaultValue={order.payment_status} onValueChange={v => updateMutation.mutate({ id: order.id, status: order.status, payment_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['unpaid', 'partial', 'paid', 'credit'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}