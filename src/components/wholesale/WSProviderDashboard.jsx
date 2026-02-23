import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function WSProviderDashboard({ provider }) {
  const { data: products = [] } = useQuery({
    queryKey: ['wsProducts', provider.id],
    queryFn: () => base44.entities.WholesaleProduct.filter({ provider_id: provider.id }),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['wsOrders', provider.id],
    queryFn: () => base44.entities.WholesaleOrder.filter({ provider_id: provider.id }, '-created_date', 50),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['wsConnections', provider.id],
    queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: provider.id }),
  });

  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeConnections = connections.filter(c => c.status === 'active');
  const activeProducts = products.filter(p => p.status === 'active');
  const recentOrders = orders.slice(0, 5);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Products', value: activeProducts.length, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active Buyers', value: activeConnections.length, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Pending Orders', value: pendingOrders.length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Total Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <Card key={i} className="border-2">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="font-black text-lg text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardContent className="p-5">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-600" /> Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-sm">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{o.order_number}</p>
                      <p className="text-xs text-slate-500">{o.company_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={statusColors[o.status] || 'bg-slate-100 text-slate-700'}>{o.status}</Badge>
                      <p className="text-xs font-bold text-indigo-700 mt-1">LKR {o.total?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-5">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-teal-600" /> Active Buyers</h3>
            {activeConnections.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-sm">No active buyer connections</p>
            ) : (
              <div className="space-y-2">
                {activeConnections.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <p className="font-semibold text-sm text-slate-900">{c.buyer_name}</p>
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}