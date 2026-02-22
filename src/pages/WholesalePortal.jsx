import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart, CreditCard, Truck, Search, Plus, Minus, X, TrendingDown } from 'lucide-react';
import { useOrganization } from '@/components/OrganizationProvider';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  medicine: '💊', surgical: '🩺', equipment: '🏥', diagnostic: '🔬',
  ppe: '🥼', lab_supply: '🧪', hospital_furniture: '🛏️', consumable: '📦', other: '📋'
};

export default function WholesalePortal() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [orderNotes, setOrderNotes] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: products = [] } = useQuery({
    queryKey: ['wholesaleProducts'],
    queryFn: () => base44.entities.WholesaleProduct.filter({ status: 'active' }),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ['myWholesaleOrders', selectedOrgId],
    queryFn: () => base44.entities.WholesaleOrder.filter({ organization_id: selectedOrgId }, '-created_date', 20),
    enabled: !!selectedOrgId,
  });

  const { data: creditAccount } = useQuery({
    queryKey: ['myCreditAccount', selectedOrgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.filter({ id: selectedOrgId });
      const org = orgs[0];
      if (!org?.company_id) return null;
      const accounts = await base44.entities.WholesaleCreditAccount.filter({ company_id: org.company_id });
      return accounts[0] || null;
    },
    enabled: !!selectedOrgId,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const orgs = await base44.entities.Organization.filter({ id: selectedOrgId });
      const org = orgs[0];
      const company = companies.find(c => c.id === org?.company_id);
      const subtotal = cart.reduce((s, i) => s + i.line_total, 0);
      const orderNum = `WS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9000)+1000}`;
      const order = await base44.entities.WholesaleOrder.create({
        order_number: orderNum,
        company_id: org?.company_id || '',
        company_name: company?.company_legal_name || org?.name || '',
        organization_id: selectedOrgId,
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
      queryClient.invalidateQueries(['myWholesaleOrders']);
      toast.success('Order placed successfully! Premier Wholesale will review and confirm.');
    },
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
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
  const statusColors = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Package className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-black">Premier Wholesale Pharma</h1>
            <p className="text-indigo-200 text-sm">Order medicines, equipment & supplies for your pharmacy</p>
          </div>
        </div>
        {creditAccount && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-200">Credit Limit</p>
              <p className="font-black text-lg">LKR {creditAccount.credit_limit?.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-200">Outstanding</p>
              <p className="font-black text-lg text-yellow-300">LKR {creditAccount.current_balance?.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-200">Payment Terms</p>
              <p className="font-black text-lg">{creditAccount.payment_terms_days} days</p>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog" className="flex items-center gap-2"><Package className="w-4 h-4" />Order Products</TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2"><Truck className="w-4 h-4" />My Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Catalog */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                    {cat === 'all' ? '🏪 All' : `${CATEGORY_ICONS[cat] || '📦'} ${cat.replace('_', ' ')}`}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-400">No products found</div>
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
                            <p className="text-xs text-slate-400 capitalize mt-1">{p.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-indigo-700 text-lg">LKR {p.unit_price?.toLocaleString()}</p>
                            {p.mrp && <p className="text-xs text-slate-400 line-through">MRP {p.mrp?.toLocaleString()}</p>}
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
                              <span className="font-bold text-indigo-700">{inCart.qty} {p.unit}</span>
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
            <div className="space-y-3">
              <Card className="border-2 border-indigo-200 sticky top-4">
                <CardHeader className="bg-indigo-50 pb-3">
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <ShoppingCart className="w-5 h-5" /> My Order ({cart.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-slate-400 text-center py-4 text-sm">No items yet. Browse the catalog and add products.</p>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-slate-100">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 leading-tight">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.qty} × LKR {item.unit_price?.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-700 text-sm">LKR {item.line_total?.toLocaleString()}</span>
                            <button onClick={() => setCart(prev => prev.filter(i => i.product_id !== item.product_id))} className="text-red-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t-2 border-indigo-200">
                        <div className="flex justify-between font-black text-lg text-indigo-900">
                          <span>Total</span>
                          <span>LKR {cartTotal.toLocaleString()}</span>
                        </div>
                      </div>
                      <textarea
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none mt-2"
                        rows={2}
                        placeholder="Notes / delivery instructions..."
                        value={orderNotes}
                        onChange={e => setOrderNotes(e.target.value)}
                      />
                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
                        onClick={() => placeOrderMutation.mutate()}
                        disabled={placeOrderMutation.isPending}
                      >
                        {placeOrderMutation.isPending ? 'Placing...' : '📦 Place Order'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-3">
            {myOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No orders placed yet</div>
            ) : myOrders.map(order => (
              <Card key={order.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{order.order_number}</p>
                      <p className="text-sm text-slate-500">{new Date(order.created_date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={statusColors[order.status] || 'bg-slate-100 text-slate-700'}>{order.status?.toUpperCase()}</Badge>
                      <p className="font-black text-indigo-700 mt-1">LKR {order.total?.toLocaleString()}</p>
                    </div>
                  </div>
                  {order.notes && <p className="text-xs text-slate-500 mt-2 italic">"{order.notes}"</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}