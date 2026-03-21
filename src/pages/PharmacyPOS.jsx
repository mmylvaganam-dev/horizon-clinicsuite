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
  X,
  Printer
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastSaleId, setLastSaleId] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const [patientSearch, setPatientSearch] = useState('');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    staleTime: 0,
    refetchOnMount: true,
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

  const { data: saleItems = [] } = useQuery({
    queryKey: ['pharmacySaleItems'],
    queryFn: () => base44.entities.PharmacySaleItem.list(),
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

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies[0]?.base_currency || 'LKR';

  const createSaleMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createPharmacySale', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacySales'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['recordLinks'] });
      setCart([]);
      setPatientId('');
      setPrescriptionId('');
      setNotes('');
      setLastSaleId(response.data?.saleId);
      setShowPrintDialog(true);
      toast.success('Sale completed successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create sale');
    }
  });

  const handlePrintInvoice = (saleId) => {
    window.open(`/api/functions/generatePharmacyInvoice?saleId=${saleId}`, '_blank');
  };

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

  const handleBarcodeSearch = (barcode) => {
    if (!barcode.trim()) return;
    
    const stockItem = pharmacyStock.find(s => s.barcode === barcode.trim());
    if (stockItem) {
      // Check if item already in cart
      const existingItem = cart.find(c => c.stock_id === stockItem.id);
      if (existingItem) {
        // Increase quantity
        updateCartItem(existingItem.id, 'quantity', existingItem.quantity + 1);
        toast.success(`Increased quantity of ${stockItem.display_name}`);
      } else {
        // Add new item
        setCart([...cart, {
          id: Date.now(),
          item_name: stockItem.display_name,
          drug_id: '',
          stock_id: stockItem.id,
          barcode: stockItem.barcode,
          quantity: 1,
          unit_price: stockItem.mrp || stockItem.unit_price || 0,
          line_total: stockItem.mrp || stockItem.unit_price || 0
        }]);
        toast.success(`Added ${stockItem.display_name} to cart`);
      }
      setBarcodeInput('');
    } else {
      toast.error('Barcode not found in stock');
    }
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
              <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                <CardContent className="pt-6">
                  <Label className="text-base font-semibold mb-3 block">Scan or Enter Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleBarcodeSearch(barcodeInput);
                        }
                      }}
                      placeholder="Scan barcode or type and press Enter"
                      className="text-lg font-mono"
                      autoFocus
                    />
                    <Button onClick={() => handleBarcodeSearch(barcodeInput)}>
                      Search
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Scanning a barcode will automatically add the item to cart</p>
                </CardContent>
              </Card>

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
                    <div className="flex gap-2">
                      <Select value={patientId} onValueChange={setPatientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Walk-in customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              placeholder="Search patient..."
                              value={patientSearch}
                              onChange={(e) => setPatientSearch(e.target.value)}
                              className="h-8 text-sm"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <SelectItem value={null}>Walk-in</SelectItem>
                          {patients
                            .filter(p => {
                              const name = `${p.first_name} ${p.last_name}`.toLowerCase();
                              const phone = p.phone || '';
                              const mobile = p.mobile || '';
                              const phn = p.phn || '';
                              const q = patientSearch.toLowerCase();
                              return !q || name.includes(q) || phone.includes(q) || mobile.includes(q) || phn.toLowerCase().includes(q);
                            })
                            .map(patient => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.first_name} {patient.last_name} {patient.phn ? `(${patient.phn})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {patientId && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setPatientId('')}
                          title="Clear patient selection"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </Button>
                      )}
                    </div>
                    {patientId && (() => {
                      const selectedPatient = patients.find(p => p.id === patientId);
                      return selectedPatient ? (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm space-y-1">
                          <p className="font-semibold text-blue-900">
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </p>
                          {selectedPatient.phone && (
                            <p className="text-blue-700 text-xs">📞 {selectedPatient.phone}</p>
                          )}
                          {selectedPatient.mobile && (
                            <p className="text-blue-700 text-xs">📱 {selectedPatient.mobile}</p>
                          )}
                          {selectedPatient.phn && (
                            <p className="text-blue-600 text-xs font-mono">PHN: {selectedPatient.phn}</p>
                          )}
                        </div>
                      ) : null;
                    })()}
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
                    <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-3">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total:</span>
                      <span>{currency} {total.toFixed(2)}</span>
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

            const itemsForSale = saleItems.filter(item => item.sale_id === sale.id);

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
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          {itemsForSale.length} items
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
                      {sale.patient_id && (() => {
                        const patient = patients.find(p => p.id === sale.patient_id);
                        return patient ? (
                          <p className="text-xs text-blue-600 mt-1">
                            {patient.phone && `📞 ${patient.phone}`}
                            {patient.phone && patient.mobile && ' | '}
                            {patient.mobile && `📱 ${patient.mobile}`}
                          </p>
                        ) : null;
                      })()}
                      <p className="text-sm text-slate-500">
                        {new Date(sale.sale_date).toLocaleString()}
                      </p>
                      <p className="text-lg font-semibold text-teal-600 mt-2">
                        {currency} {sale.total.toFixed(2)}
                      </p>
                    </div>
                    {sale.status === 'completed' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintInvoice(sale.id);
                          }}
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </Button>
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
                      </div>
                    )}
                  </div>
                </Card>
                {expandedSale === sale.id && (
                  <div className="ml-6 mt-2 space-y-2">
                    {itemsForSale.length > 0 && (
                      <Card className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Sale Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {itemsForSale.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                              <span className="font-medium">{item.item_name}</span>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">x{item.quantity}</Badge>
                                <span className="font-semibold text-teal-600">{currency} {item.line_total.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    <LinkedRecords recordType="PharmacySale" recordId={sale.id} />
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Print Invoice Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sale Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-600">Sale has been completed successfully. Would you like to print the invoice?</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPrintDialog(false)}
              >
                Done
              </Button>
              <Button
                onClick={() => {
                  handlePrintInvoice(lastSaleId);
                  setShowPrintDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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