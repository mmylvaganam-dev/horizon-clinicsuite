import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, Receipt, Plus, Trash2, Search, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { createPageUrl } from '../utils';

export default function SalesWorkspace() {
  const queryClient = useQueryClient();
  const [showSale, setShowSale] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [saleLines, setSaleLines] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.ServiceCatalog.filter({ active: true }),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: todayInvoices = [] } = useQuery({
    queryKey: ['todayInvoices'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.InvoiceHeader.list('-created_date');
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data) => {
      const invoiceNumber = `INV-${Date.now()}`;
      const subtotal = data.lines.reduce((sum, l) => sum + l.line_total, 0);
      const discountAmount = data.discount || 0;
      const taxableAmount = subtotal - discountAmount;
      const taxTotal = taxableAmount * 0.1;
      const total = taxableAmount + taxTotal;

      const invoice = await base44.entities.InvoiceHeader.create({
        organization_id: user.organization_id || '',
        location_id: user.location_id || '',
        patient_ref: data.patient_ref,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        status: 'paid',
        subtotal,
        tax_total: taxTotal,
        total,
        payment_status: 'paid',
        notes: data.discount_reason ? `Discount: $${data.discount} - ${data.discount_reason}` : ''
      });

      for (const line of data.lines) {
        await base44.entities.InvoiceLine.create({
          invoice_ref: invoice.id,
          ...line
        });
      }

      await base44.entities.Payment.create({
        invoice_ref: invoice.id,
        paid_at: new Date().toISOString(),
        amount: total,
        method: data.payment_method,
        received_by: user.id
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user.organization_id || '',
        location_id: user.location_id || '',
        patient_id: data.patient_ref,
        module: 'SALES',
        action: 'create_invoice',
        record_type: 'InvoiceHeader',
        record_id: invoice.id,
        metadata: { invoice_number: invoiceNumber, total, payment_method: data.payment_method }
      });

      return invoice;
    },
    onSuccess: () => {
      toast.success('Sale completed successfully');
      queryClient.invalidateQueries(['todayInvoices']);
      setShowSale(false);
      setSelectedPatient('');
      setSaleLines([]);
      setDiscount(0);
      setDiscountReason('');
    },
  });

  const addLine = () => {
    setSaleLines([...saleLines, { item_code: '', item_name_cache: '', category: '', qty: 1, unit_price: 0, line_total: 0 }]);
  };

  const updateLine = (index, field, value) => {
    const updated = [...saleLines];
    updated[index][field] = value;
    
    if (field === 'item_code') {
      const service = services.find(s => s.service_code === value);
      if (service) {
        updated[index].item_name_cache = service.service_name;
        updated[index].category = service.category;
        updated[index].unit_price = service.default_price;
        updated[index].line_total = service.default_price * updated[index].qty;
      }
    }
    
    if (field === 'qty' || field === 'unit_price') {
      updated[index].line_total = updated[index].qty * updated[index].unit_price;
    }
    
    setSaleLines(updated);
  };

  const removeLine = (index) => {
    setSaleLines(saleLines.filter((_, i) => i !== index));
  };

  const handleCreateSale = () => {
    if (!selectedPatient || saleLines.length === 0) {
      toast.error('Please select patient and add items');
      return;
    }
    if (discount > 0 && !discountReason) {
      toast.error('Please provide discount reason');
      return;
    }
    createSaleMutation.mutate({
      patient_ref: selectedPatient,
      lines: saleLines,
      payment_method: paymentMethod,
      discount,
      discount_reason: discountReason
    });
  };

  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(search) || p.mrn?.toLowerCase().includes(search);
  });

  const subtotal = saleLines.reduce((sum, l) => sum + l.line_total, 0);
  const discountAmount = discount || 0;
  const taxableAmount = subtotal - discountAmount;
  const taxTotal = taxableAmount * 0.1;
  const total = taxableAmount + taxTotal;

  const todayTotal = todayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const todayCount = todayInvoices.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sales Dashboard</h1>
        <p className="text-slate-500 mt-1">Front desk sales and billing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Today's Revenue</p>
                <p className="text-2xl font-bold">${todayTotal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Transactions</p>
                <p className="text-2xl font-bold">{todayCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg Transaction</p>
                <p className="text-2xl font-bold">
                  ${todayCount > 0 ? (todayTotal / todayCount).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Today's Sales</span>
              <Button onClick={() => setShowSale(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayInvoices.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No sales today</p>
            ) : (
              <div className="space-y-2">
                {todayInvoices.slice(0, 10).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{inv.invoice_number}</p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(inv.invoice_date), 'HH:mm')} • Patient: {inv.patient_ref.substring(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">${inv.total.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{inv.payment_status}</p>
                    </div>
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
            <Button className="w-full justify-start bg-teal-600 hover:bg-teal-700" onClick={() => setShowSale(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Sale
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Receipt className="w-4 h-4 mr-2" />
              End-of-Day Report
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.open(createPageUrl('Patients'), '_blank')}>
              <Users className="w-4 h-4 mr-2" />
              Register Patient
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSale} onOpenChange={setShowSale}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Patient Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchTerm && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                  {filteredPatients.map(p => (
                    <div
                      key={p.id}
                      className={`p-2 cursor-pointer hover:bg-slate-50 ${selectedPatient === p.id ? 'bg-teal-50' : ''}`}
                      onClick={() => {
                        setSelectedPatient(p.id);
                        setSearchTerm('');
                      }}
                    >
                      <p className="font-medium">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-500">MRN: {p.mrn}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedPatient && (
                <p className="text-sm text-teal-600 mt-2">
                  Selected: {patients.find(p => p.id === selectedPatient)?.first_name} {patients.find(p => p.id === selectedPatient)?.last_name}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Sale Items</label>
                <Button onClick={addLine} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line
                </Button>
              </div>

              {saleLines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <Select value={line.item_code} onValueChange={(v) => updateLine(index, 'item_code', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.service_code} value={s.service_code}>
                            {s.service_name} ({s.category}) - ${s.default_price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={line.qty}
                      onChange={(e) => updateLine(index, 'qty', parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input value={line.line_total.toFixed(2)} disabled />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Discount"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                {discount > 0 && (
                  <Input
                    placeholder="Discount reason..."
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="flex-1"
                  />
                )}
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-amber-700">
                  <span>Discount:</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Tax (10%):</span>
                <span className="font-semibold">${taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-emerald-600">${total.toFixed(2)}</span>
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
              <Button variant="outline" onClick={() => setShowSale(false)}>Cancel</Button>
              <Button onClick={handleCreateSale} disabled={createSaleMutation.isPending}>
                Complete Sale & Print Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}