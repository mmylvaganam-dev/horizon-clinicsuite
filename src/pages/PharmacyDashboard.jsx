import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Package, TrendingUp, AlertTriangle, Activity, Pill, ShoppingCart } from 'lucide-react';
import { format, startOfMonth, startOfWeek, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function PharmacyDashboard() {
  const { data: sales = [] } = useQuery({
    queryKey: ['pharmacySales'],
    queryFn: () => base44.entities.PharmacySale.list('-sale_date', 100),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventoryBalances'],
    queryFn: () => base44.entities.InventoryBalance.list(),
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => base44.entities.Prescription.list('-prescribed_date', 50),
  });

  const { data: drugCatalog = [] } = useQuery({
    queryKey: ['drugCatalog'],
    queryFn: () => base44.entities.DrugCatalog.list(),
  });

  // Calculate metrics
  const today = new Date();
  const startOfThisMonth = startOfMonth(today);
  const startOfThisWeek = startOfWeek(today);

  const todaySales = sales.filter(s => {
    const saleDate = parseISO(s.sale_date);
    return saleDate.toDateString() === today.toDateString();
  });

  const monthSales = sales.filter(s => {
    const saleDate = parseISO(s.sale_date);
    return saleDate >= startOfThisMonth;
  });

  const weekSales = sales.filter(s => {
    const saleDate = parseISO(s.sale_date);
    return saleDate >= startOfThisWeek;
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const weekRevenue = weekSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const lowStock = inventory.filter(i => i.quantity_on_hand < 20);
  const outOfStock = inventory.filter(i => i.quantity_on_hand === 0);

  const pendingPrescriptions = prescriptions.filter(p => p.status === 'Pending');
  const verifiedPrescriptions = prescriptions.filter(p => p.status === 'Verified');

  const topSellingItems = sales
    .slice(0, 20)
    .reduce((acc, sale) => {
      const items = sale.items_json || [];
      items.forEach(item => {
        const key = item.drug_name;
        if (!acc[key]) {
          acc[key] = { name: item.drug_name, qty: 0, revenue: 0 };
        }
        acc[key].qty += item.quantity;
        acc[key].revenue += item.total_price;
      });
      return acc;
    }, {});

  const topItems = Object.values(topSellingItems)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Dashboard</h1>
        <p className="text-slate-500 mt-1">Real-time pharmacy operations overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Today's Sales</p>
                <p className="text-3xl font-bold mt-1">${todayRevenue.toFixed(2)}</p>
                <p className="text-emerald-100 text-xs mt-1">{todaySales.length} transactions</p>
              </div>
              <DollarSign className="w-12 h-12 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">This Week</p>
                <p className="text-3xl font-bold mt-1">${weekRevenue.toFixed(2)}</p>
                <p className="text-blue-100 text-xs mt-1">{weekSales.length} transactions</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">This Month</p>
                <p className="text-3xl font-bold mt-1">${monthRevenue.toFixed(2)}</p>
                <p className="text-purple-100 text-xs mt-1">{monthSales.length} transactions</p>
              </div>
              <Activity className="w-12 h-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Low Stock Items</p>
                <p className="text-3xl font-bold mt-1">{lowStock.length}</p>
                <p className="text-amber-100 text-xs mt-1">{outOfStock.length} out of stock</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prescriptions & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              Pending Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPrescriptions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No pending prescriptions</p>
            ) : (
              <div className="space-y-2">
                {pendingPrescriptions.slice(0, 5).map((rx) => (
                  <div key={rx.id} className="p-3 rounded-lg border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{rx.drug_name}</p>
                        <p className="text-sm text-slate-500">Patient ID: {rx.patient_id}</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                    </div>
                  </div>
                ))}
                {pendingPrescriptions.length > 5 && (
                  <Link to={createPageUrl('PharmacyPOS')}>
                    <p className="text-sm text-blue-600 text-center pt-2 hover:underline">
                      View all {pendingPrescriptions.length} prescriptions →
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">All items well stocked</p>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{item.item_name || 'Item'}</p>
                        <p className="text-sm text-slate-500">Quantity: {item.quantity_on_hand}</p>
                      </div>
                      <Badge className={item.quantity_on_hand === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}>
                        {item.quantity_on_hand === 0 ? 'Out of Stock' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {lowStock.length > 5 && (
                  <Link to={createPageUrl('PharmacyInventory')}>
                    <p className="text-sm text-blue-600 text-center pt-2 hover:underline">
                      View all {lowStock.length} alerts →
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Items */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Top Selling Items (Recent)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No sales data yet</p>
          ) : (
            <div className="space-y-2">
              {topItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.qty} units sold</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-emerald-600">${item.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to={createPageUrl('PharmacyPOS')}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="font-semibold text-slate-900">Point of Sale</p>
                  <p className="text-sm text-slate-600">Process sales & dispense Rx</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('PharmacyInventory')}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="font-semibold text-slate-900">Inventory</p>
                  <p className="text-sm text-slate-600">Manage stock & batches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Procurement')}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-900">Procurement</p>
                  <p className="text-sm text-slate-600">Purchase orders & receiving</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}