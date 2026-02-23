import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Plus, Minus, X, ShoppingCart, Send, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = { medicine: '💊', surgical: '🩺', equipment: '🏥', diagnostic: '🔬', ppe: '🥼', lab_supply: '🧪', hospital_furniture: '🛏️', consumable: '📦', other: '📋' };

export default function WSMarketplaceBrowse({ orgId, user, connections }) {
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [orderNotes, setOrderNotes] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestProviderId, setRequestProviderId] = useState(null);

  const activeConnectionProviderIds = connections.filter(c => c.status === 'active').map(c => c.provider_id);
  const pendingProviderIds = connections.filter(c => c.status === 'pending').map(c => c.provider_id);

  const { data: allProviders = [] } = useQuery({
    queryKey: ['wholesaleProviders'],
    queryFn: () => base44.entities.WholesaleProvider.filter({ status: 'active' }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['wsProducts', selectedProviderId],
    queryFn: () => base44.entities.WholesaleProduct.filter({ provider_id: selectedProviderId, status: 'active' }),
    enabled: !!selectedProviderId && activeConnectionProviderIds.includes(selectedProviderId),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const requestConnectionMutation = useMutation({
    mutationFn: async (providerId) => {
      const provider = allProviders.find(p => p.id === providerId);
      const org = organizations.find(o => o.id === orgId);
      return await base44.entities.WholesaleConnection.create({
        provider_id: providerId,
        provider_name: provider?.company_name || '',
        buyer_organization_id: orgId,
        buyer_company_id: org?.company_id || '',
        buyer_name: org?.name || '',
        status: 'pending',
        initiated_by: 'buyer',
        credit_limit: 0,
        current_balance: 0,
        payment_terms_days: provider?.payment_terms_days || 30,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsMyConnections', orgId]);
      toast.success('Connection request sent! Awaiting provider approval.');
      setRequestOpen(false);
    },
    onError: () => toast.error('Failed to send request'),
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const provider = allProviders.find(p => p.id === selectedProviderId);
      const org = organizations.find(o => o.id === orgId);
      const subtotal = cart.reduce((s, i) => s + i.line_total, 0);
      const orderNum = `WS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
      const order = await base44.entities.WholesaleOrder.create({
        provider_id: selectedProviderId,
        provider_name: provider?.company_name || '',
        order_number: orderNum,
        company_id: org?.company_id || '',
        company_name: org?.name || '',
        organization_id: orgId,
        status: 'pending',
        subtotal,
        discount_amount: 0,
        total: subtotal,
        payment_status: 'unpaid',
        notes: orderNotes,
        ordered_by: user?.email,
      });
      await Promise.all(cart.map(item =>
        base44.entities.WholesaleOrderItem.create({
          order_id: order.id,
          provider_id: selectedProviderId,
          product_id: item.product_id,
          product_name: item.name,
          sku: item.sku || '',
          category: item.category,
          qty: item.qty,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_pct: 0,
          line_total: item.line_total,
        })
      ));
      return order;
    },
    onSuccess: () => {
      setCart([]);
      setOrderNotes('');
      setCheckoutOpen(false);
      queryClient.invalidateQueries(['wsMyOrders', orgId]);
      toast.success('Order placed! Provider will review and confirm.');
    },
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1, line_total: (i.qty + 1) * i.unit_price } : i);
      return [...prev, { product_id: product.id, name: product.name, sku: product.sku, category: product.category, unit: product.unit, unit_price: product.unit_price, qty: 1, line_total: product.unit_price }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(0, i.qty + delta);
      if (newQty === 0) return null;
      return { ...i, qty: newQty, line_total: newQty * i.unit_price };
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((s, i) => s + i.line_total, 0);
  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => {
    const matchCat = category === 'all' || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4 mt-4">
      {/* Provider Selection */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Select a Wholesale Provider to order from:</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allProviders.map(p => {
            const isConnected = activeConnectionProviderIds.includes(p.id);
            const isPending = pendingProviderIds.includes(p.id);
            const isSelected = selectedProviderId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { if (isConnected) { setSelectedProviderId(p.id); setCart([]); } }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : isConnected ? 'border-green-200 hover:border-indigo-300 bg-white' : 'border-slate-200 bg-slate-50 opacity-80'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{p.company_name}</p>
                    <p className="text-xs text-slate-500">{p.description}</p>
                  </div>
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-700 text-xs">Connected</Badge>
                  ) : isPending ? (
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>
                  ) : (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-7" onClick={(e) => { e.stopPropagation(); setRequestProviderId(p.id); setRequestOpen(true); }}>
                      <Send className="w-3 h-3 mr-1" /> Request
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">Code: {p.company_code}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Catalog */}
      {selectedProviderId && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${category === cat ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                  {cat === 'all' ? '🏪 All' : `${CATEGORY_ICONS[cat] || '📦'} ${cat.replace('_', ' ')}`}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-400"><Package className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No products found</p></div>
              ) : filteredProducts.map(p => {
                const inCart = cart.find(i => i.product_id === p.id);
                return (
                  <Card key={p.id} className="border-2 hover:border-indigo-300 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-2xl mb-1">{CATEGORY_ICONS[p.category] || '📦'}</div>
                          <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                          {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                          <p className="text-xs text-slate-400 mt-1 capitalize">{p.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-indigo-700 text-lg">LKR {Number(p.unit_price).toLocaleString()}</p>
                          {p.mrp && <p className="text-xs text-slate-400 line-through">MRP {Number(p.mrp).toLocaleString()}</p>}
                          {p.stock_qty <= 10 && <Badge className="bg-red-100 text-red-700 text-xs mt-1">Low Stock</Badge>}
                        </div>
                      </div>
                      <div className="mt-3">
                        {!inCart ? (
                          <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => addToCart(p)}>
                            <Plus className="w-3 h-3 mr-1" /> Add to Order
                          </Button>
                        ) : (
                          <div className="flex items-center justify-between bg-indigo-50 rounded-lg p-2">
                            <button onClick={() => updateQty(p.id, -1)} className="w-7 h-7 bg-white border border-indigo-200 rounded-full flex items-center justify-center hover:bg-red-50"><Minus className="w-3 h-3" /></button>
                            <span className="font-bold text-indigo-700">{inCart.qty}</span>
                            <button onClick={() => updateQty(p.id, 1)} className="w-7 h-7 bg-white border border-indigo-200 rounded-full flex items-center justify-center hover:bg-green-50"><Plus className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Cart */}
          <Card className="border-2 border-indigo-200 sticky top-4 h-fit">
            <CardHeader className="bg-indigo-50 pb-3">
              <CardTitle className="flex items-center gap-2 text-indigo-900 text-base">
                <ShoppingCart className="w-5 h-5" /> My Order ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {cart.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-sm">Add products to build your order</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.product_id} className="flex items-center justify-between py-1 border-b border-slate-100">
                      <div className="flex-1 mr-2">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.qty} × LKR {item.unit_price?.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-indigo-700 text-sm">LKR {item.line_total?.toLocaleString()}</span>
                        <button onClick={() => setCart(prev => prev.filter(i => i.product_id !== item.product_id))} className="text-red-400 hover:text-red-600 ml-1"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-indigo-900 pt-2 border-t-2 border-indigo-200">
                    <span>Total</span>
                    <span>LKR {cartTotal.toLocaleString()}</span>
                  </div>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => setCheckoutOpen(true)}>
                    📦 Place Order
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Order</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <p className="text-sm text-slate-600">{cart.length} items · Total: <strong>LKR {cartTotal.toLocaleString()}</strong></p>
            <textarea className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none" rows={3} placeholder="Notes / delivery instructions..." value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => placeOrderMutation.mutate()} disabled={placeOrderMutation.isPending}>
              {placeOrderMutation.isPending ? 'Placing...' : '✅ Confirm & Place Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Connection Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Connection to {allProviders.find(p => p.id === requestProviderId)?.company_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <p className="text-sm text-slate-600">Send a connection request to this wholesale provider. They will review and approve your request before you can place orders.</p>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => requestConnectionMutation.mutate(requestProviderId)} disabled={requestConnectionMutation.isPending}>
              {requestConnectionMutation.isPending ? 'Sending...' : '📨 Send Connection Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}