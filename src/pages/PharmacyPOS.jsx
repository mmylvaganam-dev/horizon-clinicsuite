import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Receipt, 
  RefreshCw,
  X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import LinkedRecords from '../components/shared/LinkedRecords';

export default function PharmacyPOS() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [refundType, setRefundType] = useState('refund');
  const [refundReason, setRefundReason] = useState('');
  const [expandedSale, setExpandedSale] = useState(null);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: drugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.DrugCatalog.list(),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.filter({ quality_status: 'usable' }),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['pharmacySales'],
    queryFn: () => base44.entities.PharmacySale.list('-sale_date'),
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['pharmacyReceipts'],
    queryFn: () => base44.entities.PharmacyReceipt.list(),
  });

  const { data: recordLinks = [] } = useQuery({
    queryKey: ['recordLinks'],
    queryFn: () => base44.entities.RecordLink.list('-created_at'),
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => base44.entities.Prescription.list(),
  });

  const createSaleMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createPharmacySale', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacySales'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['recordLinks'] });
      setCart([]);
      setPatientId('');
      setPrescriptionId('');
      setNotes('');
      toast.success('Sale completed successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create sale');
    }
  });

  const refundVoidMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('refundVoidSale', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacySales'] });
      setShowRefundDialog(false);
      setSelectedSale(null);
      setRefundReason('');
      toast.success('Operation completed successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Operation failed');
    }
  });

  const addToCart = () => {
    setCart([...cart, {
      id: Date.now(),
      item_name: '',
      drug_id: '',
      stock_id: '',
      barcode: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0
    }]);
  };

  const updateCartItem = (id, field, value) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.line_total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const invalidItems = cart.filter(item => !item.item_name || item.quantity <= 0 || item.unit_price <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please fill all item details');
      return;
    }

    createSaleMutation.mutate({
      saleData: {
        organization_id: '',
        location_id: '',
        patient_id: patientId || null,
        tax,
        notes
      },
      items: cart.map(({ id, ...item }) => ({
        item_name: item.item_name,
        drug_id: item.drug_id || null,
        stock_id: item.stock_id || null,
        barcode: item.barcode || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      })),
      prescriptionId: prescriptionId || null
    });
  };

  const handleRefundVoid = () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    refundVoidMutation.mutate({
      saleId: selectedSale.id,
      type: refundType,
      reason: refundReason
    });
  };

  const getReceiptNumber = (saleId) => {
    const receipt = receipts.find(r => r.sale_id === saleId);
    return receipt?.receipt_number || 'N/A';
  };

  const getPatientName = (patientId) => {
    if (!patientId) return 'Walk-in';
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    refunded: 'bg-amber-100 text-amber-700 border-amber-200',
    voided: 'bg-rose-100 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy POS</h1>
        <p className="text-slate-500 mt-1">Point of Sale system for pharmacy transactions</p>
      </div>

      <Tabs defaultValue="pos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pos">
            <ShoppingCart className="w-4 h-4 mr-2" />
            New Sale
          </TabsTrigger>
          <TabsTrigger value="history">
            <Receipt className="w-4 h-4 mr-2" />
            Sales History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Cart Items</CardTitle>
                    <Button onClick={addToCart} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cart.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Cart is empty. Add items to begin.</p>
                  ) : (
                    cart.map((item) => (
                      <Card key={item.id} className="p-4 bg-slate-50">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <div>
                                <Label>Select Product *</Label>
                                <Select 
                                  value={item.stock_id} 
                                  onValueChange={(val) => {
                                    const stockItem = pharmacyStock.find(s => s.id === val);
                                    if (stockItem) {
                                      updateCartItem(item.id, 'stock_id', val);
                                      updateCartItem(item.id, 'item_name', stockItem.display_name);
                                      updateCartItem(item.id, 'barcode', stockItem.barcode);
                                      updateCartItem(item.id, 'unit_price', stockItem.mrp || stockItem.unit_price);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Search by name or barcode" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {pharmacyStock.map(stock => (
                                      <SelectItem key={stock.id} value={stock.id}>
                                        {stock.display_name} - {stock.barcode} (Qty: {stock.quantity})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {item.item_name && (
                                <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                  <p className="font-medium">{item.item_name}</p>
                                  {item.barcode && <p className="text-xs text-slate-500">Barcode: {item.barcode}</p>}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateCartItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label>Unit Price</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateCartItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label>Line Total</Label>
                              <Input
                                type="number"
                                value={item.line_total.toFixed(2)}
                                readOnly
                                className="bg-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary & Checkout */}
            <div className="space-y-4">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Sale Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Patient (Optional)</Label>
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Walk-in customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Walk-in</SelectItem>
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.first_name} {patient.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prescription (Optional)</Label>
                    <Select value={prescriptionId} onValueChange={setPrescriptionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select prescription" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No Prescription</SelectItem>
                        {prescriptions.filter(p => p.status === 'New' || p.status === 'Verified').map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.drug_name} - {getPatientName(p.patient_id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg">
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-semibold">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-3">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || createSaleMutation.isPending}
                    className="w-full bg-white text-teal-600 hover:bg-slate-100 font-semibold"
                  >
                    {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {sales.map((sale) => {
            // Find linked prescription
            const prescriptionLink = recordLinks.find(
              link => link.right_type === 'PharmacySale' && 
                      link.right_id === sale.id && 
                      link.left_type === 'Prescription'
            );
            const linkedPrescription = prescriptionLink 
              ? prescriptions.find(p => p.id === prescriptionLink.left_id)
              : null;

            return (
              <div key={sale.id}>
                <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all">
                  <div 
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={statusColors[sale.status]}>
                          {sale.status}
                        </Badge>
                        <Badge variant="outline">
                          {getReceiptNumber(sale.id)}
                        </Badge>
                        {linkedPrescription && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                            Rx: {linkedPrescription.drug_name}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-slate-900">
                        {getPatientName(sale.patient_id)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(sale.sale_date).toLocaleString()}
                      </p>
                      <p className="text-lg font-semibold text-teal-600 mt-2">
                        ${sale.total.toFixed(2)}
                      </p>
                    </div>
                    {sale.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSale(sale);
                          setShowRefundDialog(true);
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refund/Void
                      </Button>
                    )}
                  </div>
                </Card>
                {expandedSale === sale.id && (
                  <div className="ml-6 mt-2">
                    <LinkedRecords recordType="PharmacySale" recordId={sale.id} />
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Refund/Void Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund or Void Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Action Type</Label>
              <Select value={refundType} onValueChange={setRefundType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund/void"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefundDialog(false);
                  setRefundReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRefundVoid}
                disabled={refundVoidMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {refundVoidMutation.isPending ? 'Processing...' : `Confirm ${refundType}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}