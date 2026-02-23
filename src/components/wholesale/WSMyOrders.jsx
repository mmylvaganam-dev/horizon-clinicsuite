import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';

const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800' };
const PAY_COLORS = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', credit: 'bg-blue-100 text-blue-700' };

export default function WSMyOrders({ orgId }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['wsMyOrders', orgId],
    queryFn: () => base44.entities.WholesaleOrder.filter({ organization_id: orgId }, '-created_date', 50),
    enabled: !!orgId,
  });

  return (
    <div className="space-y-3 mt-4">
      {orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><Truck className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No orders placed yet</p></div>
      ) : orders.map(order => (
        <Card key={order.id} className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900">{order.order_number}</p>
                  <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                  <Badge className={PAY_COLORS[order.payment_status]}>{order.payment_status}</Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">From: {order.provider_name} · {new Date(order.created_date).toLocaleDateString('en-GB')}</p>
                {order.notes && <p className="text-xs text-slate-400 mt-1 italic">"{order.notes}"</p>}
              </div>
              <p className="font-black text-indigo-700 text-lg">LKR {order.total?.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}