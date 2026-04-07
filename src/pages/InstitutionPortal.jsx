import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, ShoppingCart, Plus, Minus, Send, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import InstitutionAuthGate from '@/components/institutions/InstitutionAuthGate';
import InstitutionCart from '@/components/institutions/InstitutionCart';
import ProductSearch from '@/components/institutions/ProductSearch';

export default function InstitutionPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [institutionId, setInstitutionId] = useState(null);
  const [user, setUser] = useState(null);

  // Check authentication and get user/institution context
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          window.location.href = '/landing';
          return;
        }
        setUser(currentUser);

        // Try to find institution this user belongs to
        // (stored in user profile or via a function that resolves institution)
        const userInstitutions = await base44.functions.invoke('getInstitutionForUser');
        if (userInstitutions?.institution_id) {
          setInstitutionId(userInstitutions.institution_id);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/landing';
      }
    };
    checkAuth();
  }, []);

  // Fetch institution details
  const { data: institution } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const inst = await base44.entities.Institution.list();
      return inst.find(i => i.id === institutionId);
    },
    enabled: !!institutionId,
  });

  // Fetch available products from all pharmacies
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['pharmacyProducts'],
    queryFn: async () => {
      const drugs = await base44.entities.DrugCatalog.list();
      const products = await base44.entities.ProductCatalog.list();
      return [...(drugs || []), ...(products || [])];
    },
  });

  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.drug_name?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  // Submit purchase order
  const submitOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const poNumber = `PO-${Date.now()}`;
      const po = await base44.entities.PurchaseOrder.create({
        organization_id: institutionId,
        po_number: poNumber,
        supplier_name: 'Pharmacy Credit System',
        status: 'sent',
        order_date: new Date().toISOString().split('T')[0],
        created_by: user.email,
        created_by_email: user.email,
        created_at: new Date().toISOString(),
        notes: `Institution Portal Order - ${institution?.institution_name}`,
      });

      // Create purchase order lines
      for (const item of cart) {
        await base44.entities.PurchaseOrderLine.create({
          organization_id: institutionId,
          purchase_order_id: po.id,
          product_id: item.id,
          product_name: item.name || item.drug_name,
          quantity: item.quantity,
          unit_price: item.price || 0,
          line_total: (item.price || 0) * item.quantity,
        });
      }

      return po;
    },
    onSuccess: (po) => {
      toast({
        title: 'Order Submitted',
        description: `Purchase order ${po.po_number} has been sent to the pharmacy for review.`,
      });
      setCart([]);
      setShowCart(false);
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit order',
        variant: 'destructive',
      });
    },
  });

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast({
      title: 'Added to Cart',
      description: `${product.name || product.drug_name} added`,
    });
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items before submitting an order',
        variant: 'destructive',
      });
      return;
    }
    submitOrderMutation.mutate();
  };

  if (!user || !institution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-600">Loading your institution...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Pharmacy Portal</h1>
              <p className="text-slate-600 mt-1">{institution.institution_name}</p>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {showCart ? (
          <InstitutionCart
            cart={cart}
            institution={institution}
            onRemove={removeFromCart}
            onSubmit={handleSubmitOrder}
            isSubmitting={submitOrderMutation.isPending}
            onClose={() => setShowCart(false)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Coming Soon */}
            <div className="hidden lg:block space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Institution Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Institution</p>
                    <p className="font-semibold text-slate-900">{institution.institution_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Type</p>
                    <Badge>{institution.institution_type}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                    <Badge variant={institution.status === 'active' ? 'default' : 'destructive'}>
                      {institution.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Product Search */}
            <div className="lg:col-span-3">
              <ProductSearch
                products={filteredProducts}
                isLoading={isLoadingProducts}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddToCart={addToCart}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}