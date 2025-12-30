import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, DollarSign, Activity, Plus, Scan, Trash2, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';

export default function PharmacyWorkspace() {
  const queryClient = useQueryClient();
  const [showPOS, setShowPOS] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.ProductCatalog.filter({ active: true }),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['todaySales'],
    queryFn: () => base44.entities.PharmacySaleHeader.list('-created_date', 10),
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data) => {
      const saleNumber = `PS-${Date.now()}`;
      const subtotal = data.items.reduce((sum, i) => sum + i.line_total, 0);
      const taxTotal = subtotal * 0.1;
      const total = subtotal + taxTotal;

      const sale = await base44.entities.PharmacySaleHeader.create({
        organization_id: user.organization_id || '',
        location_id: user.location_id || '',
        patient_ref: data.patient_ref || '',
        sale_number: saleNumber,
        sale_date: new Date().toISOString(),
        status: 'paid',
        subtotal,
        tax_total: taxTotal,
        total,
        payment_method: data.payment_method
      });

      for (const item of data.items) {
        await base44.entities.PharmacySaleLine.create({
          sale_ref: sale.id,
          ...item
        });
      }

      return sale;
    },
    onSuccess: () => {
      toast.success('Sale completed successfully');
      queryClient.invalidateQueries(['todaySales']);
      setShowPOS(false);
      setCartItems([]);
      setSelectedPatient('');
    },
  });

  const handleBarcodeInput = (e) => {
    const barcode = e.target.value;
    setBarcodeInput(barcode);

    if (barcode.length > 0) {
      const product = products.find(p => p.barcode_value === barcode);
      if (product) {
        addToCart(product);
        setBarcodeInput('');
      }
    }
  };

  const addToCart = (product) => {
    const existing = cartItems.find(i => i.product_code === product.product_code);
    if (existing) {
      updateCartItem(existing.product_code, 'qty', existing.qty + 1);
    } else {
      setCartItems([...cartItems, {
        product_code: product.product_code,
        barcode_value: product.barcode_value,
        product_name_cache: product.product_name,
        qty: 1,
        unit_price: product.sale_price,
        line_total: product.sale_price
      }]);
    }
  };

  const updateCartItem = (code, field, value) => {
    const updated = cartItems.map(item => {
      if (item.product_code === code) {
        const newItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'unit_price') {
          newItem.line_total = newItem.qty * newItem.unit_price;
        }
        return newItem;
      }
      return item;
    });
    setCartItems(updated);
  };

  const removeFromCart = (code) => {
    setCartItems(cartItems.filter(i => i.product_code !== code));
  };

  const handleCompleteSale = () => {
    if (cartItems.length === 0) {
      toast.error('Add items to cart');
      return;
    }
    createSaleMutation.mutate({
      patient_ref: selectedPatient,
      items: cartItems,
      payment_method: paymentMethod
    });
  };

  const subtotal = cartItems.reduce((sum, i) => sum + i.line_total, 0);
  const taxTotal = subtotal * 0.1;
  const total = subtotal + taxTotal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Workspace</h1>
        <p className="text-slate-500 mt-1">Point of Sale, dispensing, and inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Today's Sales</p>
                <p className="text-2xl font-bold">{sales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Low Stock Items</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Prescriptions</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Sales</span>
              <Button onClick={() => setShowPOS(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No sales yet</p>
            ) : (
              <div className="space-y-2">
                {sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{sale.sale_number}</p>
                      <p className="text-sm text-slate-500">{sale.payment_method}</p>
                    </div>
                    <p className="font-bold text-emerald-600">${sale.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => setShowPOS(true)}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Open POS
            </Button>
            <Link to={createPageUrl('PharmacyInventory')}>
              <Button className="w-full justify-start" variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Inventory
              </Button>
            </Link>
            <Link to={createPageUrl('Prescriptions')}>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                Prescriptions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPOS} onOpenChange={setShowPOS}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pharmacy Point of Sale</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Scan Barcode</label>
              <div className="flex gap-2">
                <Scan className="w-5 h-5 text-slate-400 mt-2" />
                <Input
                  placeholder="Scan or enter barcode..."
                  value={barcodeInput}
                  onChange={handleBarcodeInput}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Patient (Optional)</label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient or skip for OTC" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Cart Items</label>
              {cartItems.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Cart is empty - scan items to add</p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.product_code} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <Input value={item.product_name_cache} disabled />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateCartItem(item.product_code, 'qty', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input value={item.unit_price.toFixed(2)} disabled />
                    </div>
                    <div className="col-span-2">
                      <Input value={item.line_total.toFixed(2)} disabled />
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.product_code)}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax (10%):</span>
                <span className="font-semibold">${taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPOS(false)}>Cancel</Button>
              <Button onClick={handleCompleteSale} disabled={createSaleMutation.isPending}>
                Complete Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}