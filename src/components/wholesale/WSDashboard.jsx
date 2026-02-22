import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function WSDashboard() {
  const { data: orders = [] } = useQuery({ queryKey: ['wsOrders'], queryFn: () => base44.entities.WholesaleOrder.list('-created_date', 100) });
  const { data: products = [] } = useQuery({ queryKey: ['wholesaleProducts'], queryFn: () => base44.entities.WholesaleProduct.list() });
  const { data: creditAccounts = [] } = useQuery({ queryKey: ['wsCreditAccounts'], queryFn: () => base44.entities.WholesaleCreditAccount.list() });
  const { data: payments = [] } = useQuery({ queryKey: ['wsPayments'], queryFn: () => base44.entities.WholesalePayment.list('-created_date', 50) });

  const pending = orders.filter(o => o.status === 'pending');
  const totalRevenue = orders.filter(o => ['delivered', 'shipped'].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0);
  const totalOutstanding = creditAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
  const lowStock = products.filter(p => (p.stock_qty || 0) <= 10);

  const recentOrders = orders.slice(0, 8);
  const statusColors = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Orders', value: pending.length, icon: Clock, color: 'text-yellow-600 bg-yellow-50', badge: pending.length > 0 ? 'Action Needed' : null },
          { label: 'Total Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: 'Outstanding Credit', value: `LKR ${totalOutstanding.toLocaleString()}`, icon: CreditCard, color: 'text-red-600 bg-red-50' },
          { label: 'Low Stock Items', value: lowStock.length, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, badge }) => (
          <Card key={label} className="border-2">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              {badge && <Badge className="bg-yellow-100 text-yellow-800 text-xs mt-1">{badge}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <Card className="border-2">
          <CardHeader className="bg-slate-50 pb-3">
            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No orders yet</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-sm text-slate-900">{o.order_number}</p>
                  <p className="text-xs text-slate-500">{o.company_name} · {new Date(o.created_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-right">
                  <Badge className={statusColors[o.status] || 'bg-slate-100 text-slate-700'}>{o.status}</Badge>
                  <p className="text-xs font-bold text-indigo-700 mt-1">LKR {o.total?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="border-2 border-orange-200">
          <CardHeader className="bg-orange-50 pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800"><AlertTriangle className="w-4 h-4" /> Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowStock.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-6 text-green-600 text-sm">
                <CheckCircle className="w-5 h-5" /> All products are sufficiently stocked
              </div>
            ) : lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-orange-100 last:border-0">
                <p className="font-semibold text-sm text-slate-900">{p.name}</p>
                <Badge className="bg-red-100 text-red-700">{p.stock_qty ?? 0} left</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}