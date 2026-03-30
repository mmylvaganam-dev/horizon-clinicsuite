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
  DollarSign, 
  FileText, 
  CreditCard,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Billing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({
    patient_id: '',
    patient_name: '',
    location_id: '',
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    method: 'cash',
    amount: 0,
    reference: '',
    notes: ''
  });

  const [voidReason, setVoidReason] = useState('');
  const [voidType, setVoidType] = useState('void');

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-issued_at'),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-paid_at'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['serviceCatalog'],
    queryFn: () => base44.entities.ServiceCatalog.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createInvoice', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowInvoiceDialog(false);
      setInvoiceLines([]);
      toast.success('Invoice created!');
    }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('recordPayment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowPaymentDialog(false);
      toast.success('Payment recorded!');
    }
  });

  const voidInvoiceMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('voidRefundInvoice', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowVoidDialog(false);
      toast.success('Invoice voided!');
    }
  });

  const addInvoiceLine = () => {
    setInvoiceLines([...invoiceLines, {
      id: Date.now(),
      service_code: '',
      description: '',
      category: 'other',
      qty: 1,
      unit_price: 0
    }]);
  };

  const updateLine = (id, field, value) => {
    setInvoiceLines(invoiceLines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const removeLine = (id) => {
    setInvoiceLines(invoiceLines.filter(line => line.id !== id));
  };

  const handleCreateInvoice = () => {
    if (invoiceLines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    createInvoiceMutation.mutate({
      invoiceData: {
        organization_id: '',
        location_id: invoiceForm.location_id,
        patient_id: invoiceForm.patient_id || null,
        patient_name: invoiceForm.patient_name,
        notes: invoiceForm.notes,
        status: 'issued'
      },
      lines: invoiceLines.map(({ id, ...line }) => line),
      linkedRecords: []
    });
  };

  const handleRecordPayment = () => {
    if (paymentForm.amount <= 0 || paymentForm.amount > selectedInvoice.balance) {
      toast.error('Invalid payment amount');
      return;
    }

    recordPaymentMutation.mutate({
      invoiceId: selectedInvoice.id,
      paymentData: paymentForm
    });
  };

  const handleVoid = () => {
    if (!voidReason.trim()) {
      toast.error('Reason is required');
      return;
    }

    voidInvoiceMutation.mutate({
      invoiceId: selectedInvoice.id,
      type: voidType,
      reason: voidReason
    });
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    issued: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    void: 'bg-rose-100 text-rose-700'
  };

  const outstandingBalance = invoices
    .filter(inv => inv.status === 'issued')
    .reduce((sum, inv) => sum + inv.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
            <p className="text-slate-500 mt-1">Invoice and payment management</p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl('FinanceDashboard'))}>
            Open Accounting →
          </Button>
        </div>
        <Button onClick={() => setShowInvoiceDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Outstanding</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${outstandingBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Invoices</p>
                <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3 mt-6">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono">
                      {invoice.invoice_number}
                    </Badge>
                    <Badge variant="outline" className={statusColors[invoice.status]}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {invoice.patient_name || 'Walk-in Patient'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {format(new Date(invoice.issued_at), 'MMM d, yyyy')}
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total:</span>
                      <span className="font-semibold">${invoice.total.toFixed(2)}</span>
                    </div>
                    {invoice.status !== 'void' && invoice.balance > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>Balance Due:</span>
                        <span className="font-semibold">${invoice.balance.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {invoice.status === 'issued' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setPaymentForm({ method: 'cash', amount: invoice.balance, reference: '', notes: '' });
                        setShowPaymentDialog(true);
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay
                    </Button>
                  )}
                  {invoice.status !== 'void' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setVoidType(invoice.amount_paid > 0 ? 'refund' : 'void');
                        setShowVoidDialog(true);
                      }}
                    >
                      Void
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3 mt-6">
          {payments.map((payment) => {
            const invoice = invoices.find(inv => inv.id === payment.invoice_id);
            return (
              <Card key={payment.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{payment.method}</Badge>
                      {invoice && (
                        <Badge variant="outline" className="font-mono">
                          {invoice.invoice_number}
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-emerald-600">${payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(payment.paid_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {payment.reference && (
                      <p className="text-xs text-slate-400 mt-1">Ref: {payment.reference}</p>
                    )}
                  </div>
                  <p className="text-slate-600">{invoice?.patient_name || 'N/A'}</p>
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient</Label>
                <Select 
                  value={invoiceForm.patient_id} 
                  onValueChange={(val) => {
                    const patient = patients.find(p => p.id === val);
                    setInvoiceForm({
                      ...invoiceForm, 
                      patient_id: val,
                      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
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
                <Label>Location</Label>
                <Select value={invoiceForm.location_id} onValueChange={(val) => setInvoiceForm({...invoiceForm, location_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Services *</Label>
                <Button size="sm" onClick={addInvoiceLine}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line
                </Button>
              </div>
              <div className="space-y-3">
                {invoiceLines.map((line) => (
                  <Card key={line.id} className="p-4 bg-slate-50">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label>Service</Label>
                          <Select 
                            value={line.service_code} 
                            onValueChange={(val) => {
                              const service = services.find(s => s.code === val);
                              if (service) {
                                updateLine(line.id, 'service_code', val);
                                updateLine(line.id, 'description', service.name);
                                updateLine(line.id, 'category', service.category);
                                updateLine(line.id, 'unit_price', service.default_price);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.filter(s => s.is_active).map(s => (
                                <SelectItem key={s.id} value={s.code}>
                                  {s.name} - ${s.default_price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          className="mt-6"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => updateLine(line.id, 'qty', parseFloat(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Total</Label>
                          <Input
                            value={(line.qty * line.unit_price).toFixed(2)}
                            readOnly
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice} disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-slate-50 p-4 rounded">
              <p className="text-sm text-slate-500">Invoice</p>
              <p className="font-semibold">{selectedInvoice?.invoice_number}</p>
              <p className="text-lg font-bold text-slate-900 mt-2">
                Balance: ${selectedInvoice?.balance.toFixed(2)}
              </p>
            </div>
            <div>
              <Label>Payment Method *</Label>
              <Select value={paymentForm.method} onValueChange={(val) => setPaymentForm({...paymentForm, method: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Reference</Label>
              <Input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                placeholder="Transaction ID or check number"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending ? 'Processing...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Void/Refund Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{voidType === 'void' ? 'Void Invoice' : 'Refund Invoice'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-amber-50 p-4 rounded border border-amber-200">
              <p className="text-sm font-medium text-amber-900">
                This will {voidType} invoice {selectedInvoice?.invoice_number}
              </p>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter reason for void/refund"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleVoid} 
                disabled={voidInvoiceMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {voidInvoiceMutation.isPending ? 'Processing...' : `Confirm ${voidType}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}