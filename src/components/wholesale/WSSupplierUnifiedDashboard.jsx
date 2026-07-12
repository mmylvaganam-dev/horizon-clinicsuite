import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ShoppingCart, DollarSign, Clock, Plus, Pencil, Search, Truck, TrendingUp, Users, ChevronRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800',
};
const PAY_COLORS = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', credit: 'bg-blue-100 text-blue-700' };
const CATEGORIES = ['medicine', 'surgical', 'equipment', 'diagnostic', 'ppe', 'lab_supply', 'consumable', 'other'];
const EMPTY_PROD = { name: '', brand: '', sku: '', category: 'medicine', unit: 'box', unit_price: '', mrp: '', stock_qty: '', min_order_qty: 1, reorder_level: 10, description: '', status: 'active' };

export default function WSSupplierUnifiedDashboard({ provider, onNavigate }) {
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState('');
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [prodForm, setProdForm] = useState(EMPTY_PROD);

  // Load all data in parallel
  const { data: products = [] } = useQuery({
    queryKey: ['wsProducts', provider.id],
    queryFn: () => base44.entities.WholesaleProduct.filter({ provider_id: provider.id }),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ['wsOrders', provider.id],
    queryFn: () => base44.entities.WholesaleOrder.filter({ provider_id: provider.id }, '-created_date', 100),
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ['wsOrderItems', provider.id],
    queryFn: () => base44.entities.WholesaleOrderItem.filter({ provider_id: provider.id }),
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ['wsDeliveries', provider.id],
    queryFn: () => base44.entities.WholesaleDelivery.filter({ provider_id: provider.id }, '-created_date', 100),
  });
  const { data: connections = [] } = useQuery({
    queryKey: ['wsConnections', provider.id],
    queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: provider.id }),
  });

  // ---- KPIs ----
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const processingOrders = orders.filter(o => o.status === 'approved' || o.status === 'processing');
  const shippedOrders = orders.filter(o => o.status === 'shipped');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const paidRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0);
  const outstandingRevenue = orders.filter(o => o.payment_status === 'unpaid' || o.payment_status === 'partial').reduce((s, o) => s + (o.total || 0), 0);
  const activeBuyers = connections.filter(c => c.status === 'active');
  const lowStockProducts = products.filter(p => p.stock_qty != null && p.stock_qty <= (p.reorder_level || 10));

  // ---- Product mutations ----
  const saveProductMutation = useMutation({
    mutationFn: async () => {
      const data = { ...prodForm, provider_id: provider.id, unit_price: Number(prodForm.unit_price), mrp: Number(prodForm.mrp) || undefined, stock_qty: Number(prodForm.stock_qty) || 0, min_order_qty: Number(prodForm.min_order_qty) || 1, reorder_level: Number(prodForm.reorder_level) || 10 };
      if (editingProd) return await base44.entities.WholesaleProduct.update(editingProd.id, data);
      return await base44.entities.WholesaleProduct.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsProducts', provider.id]);
      toast.success(editingProd ? 'Product updated!' : 'Product added!');
      setProdDialogOpen(false); setEditingProd(null); setProdForm(EMPTY_PROD);
    },
  });

  const openEditProduct = (p) => {
    setEditingProd(p);
    setProdForm({ name: p.name, brand: p.brand || '', sku: p.sku || '', category: p.category, unit: p.unit, unit_price: p.unit_price, mrp: p.mrp || '', stock_qty: p.stock_qty, min_order_qty: p.min_order_qty || 1, reorder_level: p.reorder_level ?? 10, description: p.description || '', status: p.status });
    setProdDialogOpen(true);
  };
  const openNewProduct = () => { setEditingProd(null); setProdForm(EMPTY_PROD); setProdDialogOpen(true); };

  // ---- Order status mutations ----
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...fields }) => await base44.entities.WholesaleOrder.update(id, fields),
    onSuccess: () => { queryClient.invalidateQueries(['wsOrders', provider.id]); toast.success('Order updated!'); },
  });

  const filteredProducts = products.filter(p =>
    !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand?.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const kpis = [
    { label: 'Pending Requests', value: pendingOrders.length, sub: `${processingOrders.length} in progress`, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Outstanding', value: `LKR ${(outstandingRevenue / 1000).toFixed(0)}K`, sub: `of ${orders.length} orders`, icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Paid Revenue', value: `LKR ${(paidRevenue / 1000).toFixed(0)}K`, sub: `${deliveredOrders.length} delivered`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Buyers', value: activeBuyers.length, sub: `${lowStockProducts.length} low stock`, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((stat, i) => (
          <Card key={i} className="border-2 hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="font-black text-lg text-slate-900 truncate">{stat.value}</p>
                <p className="text-xs text-slate-400 truncate">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">{lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} at or below reorder level</p>
            <p className="text-xs text-amber-600">{lowStockProducts.slice(0, 3).map(p => p.name).join(', ')}{lowStockProducts.length > 3 ? '…' : ''}</p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100" onClick={() => onNavigate?.('products')}>
            Manage <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ---- Incoming Pharmacy Requests ---- */}
        <Card className="border-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-600" /> Incoming Pharmacy Requests</h3>
              <Button size="sm" variant="ghost" onClick={() => onNavigate?.('orders')}>View All <ChevronRight className="w-3 h-3" /></Button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {orders.slice(0, 8).map(order => {
                  const items = allItems.filter(i => i.order_id === order.id);
                  const delivery = deliveries.find(d => d.order_id === order.id);
                  return (
                    <div key={order.id} className="border border-slate-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900 truncate">{order.order_number}</p>
                          <p className="text-xs text-slate-500">{order.company_name} · {new Date(order.created_date).toLocaleDateString('en-GB')}</p>
                        </div>
                        <p className="font-black text-indigo-700 text-sm flex-shrink-0">LKR {order.total?.toLocaleString()}</p>
                      </div>

                      {items.length > 0 && (
                        <p className="text-xs text-slate-400 mb-2 truncate">
                          {items.slice(0, 2).map(i => `${i.product_name} ×${i.qty}`).join(', ')}{items.length > 2 ? ` +${items.length - 2} more` : ''}
                        </p>
                      )}

                      {delivery && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                          <Truck className="w-3 h-3" />
                          <span>{delivery.status} · {delivery.driver_name || 'Driver TBD'}</span>
                        </div>
                      )}

                      {/* Inline status controls */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Order Status</p>
                          <Select value={order.status} onValueChange={v => updateOrderMutation.mutate({ id: order.id, status: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'].map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Payment</p>
                          <Select value={order.payment_status} onValueChange={v => updateOrderMutation.mutate({ id: order.id, payment_status: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['unpaid', 'partial', 'paid', 'credit'].map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Product Catalog Quick Manager ---- */}
        <Card className="border-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Package className="w-5 h-5 text-teal-600" /> Product Catalog</h3>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={openNewProduct}><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pl-9 h-9 text-sm" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{products.length === 0 ? 'No products yet. Add your first.' : 'No matches'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredProducts.slice(0, 15).map(p => {
                  const isLow = p.stock_qty != null && p.stock_qty <= (p.reorder_level || 10);
                  return (
                    <div key={p.id} className="flex items-center gap-3 border border-slate-200 rounded-lg p-2.5 hover:border-teal-300 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.brand || p.sku || p.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-teal-700 text-sm">LKR {Number(p.unit_price).toLocaleString()}</p>
                        <p className={`text-xs ${isLow ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>Stock: {p.stock_qty}{isLow ? ' ⚠' : ''}</p>
                      </div>
                      <button onClick={() => openEditProduct(p)} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-md hover:bg-slate-50 flex-shrink-0">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {filteredProducts.length > 15 && (
                  <Button size="sm" variant="ghost" className="w-full" onClick={() => onNavigate?.('products')}>
                    View all {filteredProducts.length} products <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Delivery Progress Strip ---- */}
      <Card className="border-2">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Truck className="w-5 h-5 text-blue-600" /> Delivery Progress</h3>
            <Button size="sm" variant="ghost" onClick={() => onNavigate?.('delivery')}>Manage Deliveries <ChevronRight className="w-3 h-3" /></Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Pending', count: pendingOrders.length, color: 'bg-yellow-100 text-yellow-800' },
              { label: 'Processing', count: processingOrders.length, color: 'bg-purple-100 text-purple-800' },
              { label: 'Shipped', count: shippedOrders.length, color: 'bg-indigo-100 text-indigo-800' },
              { label: 'Delivered', count: deliveredOrders.length, color: 'bg-green-100 text-green-800' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-xl border border-slate-200">
                <Badge className={`${s.color} text-xs mb-1`}>{s.label}</Badge>
                <p className="font-black text-2xl text-slate-900">{s.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---- Product Dialog ---- */}
      <Dialog open={prodDialogOpen} onOpenChange={setProdDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProd ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Brand</Label><Input value={prodForm.brand} onChange={e => setProdForm(f => ({ ...f, brand: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={prodForm.sku} onChange={e => setProdForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div>
                <Label>Category</Label>
                <Select value={prodForm.category} onValueChange={v => setProdForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unit Price *</Label><Input type="number" value={prodForm.unit_price} onChange={e => setProdForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
              <div><Label>MRP</Label><Input type="number" value={prodForm.mrp} onChange={e => setProdForm(f => ({ ...f, mrp: e.target.value }))} /></div>
              <div><Label>Unit</Label><Input value={prodForm.unit} onChange={e => setProdForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Stock Qty</Label><Input type="number" value={prodForm.stock_qty} onChange={e => setProdForm(f => ({ ...f, stock_qty: e.target.value }))} /></div>
              <div><Label>Min Order</Label><Input type="number" value={prodForm.min_order_qty} onChange={e => setProdForm(f => ({ ...f, min_order_qty: e.target.value }))} /></div>
              <div><Label>Reorder Level</Label><Input type="number" value={prodForm.reorder_level} onChange={e => setProdForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={prodForm.status} onValueChange={v => setProdForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => saveProductMutation.mutate()} disabled={!prodForm.name || !prodForm.unit_price || saveProductMutation.isPending}>
              {saveProductMutation.isPending ? 'Saving...' : editingProd ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}