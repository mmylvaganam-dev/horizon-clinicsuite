import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart,
  Search,
  Barcode,
  User,
  Calendar,
  Eye,
  Download,
  Plus,
  Minus,
  X,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PharmacyBilling() {
  const queryClient = useQueryClient();
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('name');

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  // Product categories
  const categories = [
    '1-ACNE PRO TAX',
    'Antiseptic',
    'BASIC DRUG Tabs',
    'Common OTC tabs',
    'COVID tabs',
    'Digestive enzyme for injection (10ml)',
    'UNIAX Ampo',
    'Disposable syringe (10ml)',
    'Propedolic syringe (10ml)'
  ];

  // Stats (mock data based on image)
  const stats = {
    loading: 76,
    stored: 70,
    billing: 0,
    mine: 14,
    days: 15
  };

  // Filter stock by category and search
  const filteredStock = pharmacyStock.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch && item.quality_status === 'usable';
  });

  // Frequently used items (mock)
  const frequentlyUsed = pharmacyStock.slice(0, 10);

  const addToCart = (item) => {
    const existing = cart.find(c => c.stock_id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.stock_id === item.id 
          ? {...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price}
          : c
      ));
    } else {
      setCart([...cart, {
        stock_id: item.id,
        display_name: item.display_name,
        barcode: item.barcode,
        quantity: 1,
        unit_price: item.mrp || item.unit_price || 0,
        total: item.mrp || item.unit_price || 0
      }]);
    }
    toast.success(`Added ${item.display_name}`);
  };

  const updateQuantity = (stockId, change) => {
    setCart(cart.map(item => {
      if (item.stock_id === stockId) {
        const newQty = Math.max(1, item.quantity + change);
        return {...item, quantity: newQty, total: newQty * item.unit_price};
      }
      return item;
    }));
  };

  const removeFromCart = (stockId) => {
    setCart(cart.filter(item => item.stock_id !== stockId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // Can be configured
  const total = subtotal + tax;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Pharmacy Billing</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="bg-white/20 border-white/30 text-white"
            />
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/20">
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <span className="text-sm font-bold text-yellow-700">{stats.loading}</span>
            </div>
            <span className="text-sm text-slate-600">Loading</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-700">{stats.stored}</span>
            </div>
            <span className="text-sm text-slate-600">Stored</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-700">{stats.billing}</span>
            </div>
            <span className="text-sm text-slate-600">Billing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-sm font-bold text-purple-700">{stats.mine}</span>
            </div>
            <span className="text-sm text-slate-600">Mine</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <span className="text-sm font-bold text-rose-700">{stats.days}</span>
            </div>
            <span className="text-sm text-slate-600">Days</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Categories & Frequently Used */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-slate-900 mb-3">FREQUENTLY USED</h3>
            <div className="space-y-1">
              {frequentlyUsed.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 transition-colors"
                >
                  {item.display_name || '[N/A]'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3">CATEGORIES</h3>
            <div className="space-y-1">
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    selectedCategory === cat ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 bg-white border-b space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Invoice Number"
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Patient name, mobile, PAT ID, Home Nurse"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="name">Name</TabsTrigger>
                <TabsTrigger value="generics">Generics</TabsTrigger>
                <TabsTrigger value="substitutes">Substitutes</TabsTrigger>
                <TabsTrigger value="barcods">Barcods</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search Items"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredStock.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2">
                        {item.display_name}
                      </p>
                      <Badge variant="outline" className="text-xs mb-2">
                        {item.barcode}
                      </Badge>
                      <p className="text-lg font-bold text-emerald-600">
                        ${(item.mrp || item.unit_price || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Stock: {item.quantity}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Cart */}
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Cart</h3>
              <Badge className="bg-indigo-600">{cart.length} items</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <Card key={item.stock_id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm flex-1">{item.display_name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.stock_id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.stock_id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.stock_id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-emerald-600">${item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="border-t p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax:</span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-indigo-600">${total.toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={cart.length === 0}>
              <Check className="w-5 h-5 mr-2" />
              Complete Sale
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}