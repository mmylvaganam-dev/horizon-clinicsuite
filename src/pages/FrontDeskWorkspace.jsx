import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, DollarSign, Plus, Receipt, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';

export default function FrontDeskWorkspace() {
  const queryClient = useQueryClient();
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

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

  const { data: invoices = [] } = useQuery({
    queryKey: ['todayInvoices'],
    queryFn: () => base44.entities.InvoiceHeader.list('-created_date', 10),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data) => {
      const invoiceNumber = `INV-${Date.now()}`;
      const subtotal = data.lines.reduce((sum, l) => sum + l.line_total, 0);
      const taxTotal = subtotal * 0.1; // 10% tax
      const total = subtotal + taxTotal;

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
        payment_status: 'paid'
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

      return invoice;
    },
    onSuccess: () => {
      toast.success('Invoice created successfully');
      queryClient.invalidateQueries(['todayInvoices']);
      setShowInvoice(false);
      setSelectedPatient('');
      setInvoiceLines([]);
    },
  });

  const addLine = () => {
    setInvoiceLines([...invoiceLines, { item_code: '', item_name_cache: '', category: '', qty: 1, unit_price: 0, line_total: 0 }]);
  };

  const updateLine = (index, field, value) => {
    const updated = [...invoiceLines];
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
    
    setInvoiceLines(updated);
  };

  const removeLine = (index) => {
    setInvoiceLines(invoiceLines.filter((_, i) => i !== index));
  };

  const handleCreateInvoice = () => {
    if (!selectedPatient || invoiceLines.length === 0) {
      toast.error('Please select patient and add items');
      return;
    }
    createInvoiceMutation.mutate({
      patient_ref: selectedPatient,
      lines: invoiceLines,
      payment_method: paymentMethod
    });
  };

  const subtotal = invoiceLines.reduce((sum, l) => sum + l.line_total, 0);
  const taxTotal = subtotal * 0.1;
  const total = subtotal + taxTotal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Front Desk Workspace</h1>
        <p className="text-slate-500 mt-1">Patient registration, booking, and billing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Today's Appointments</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Today's Revenue</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Patients Seen</p>
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
              <span>Recent Invoices</span>
              <Button onClick={() => setShowInvoice(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No invoices yet</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{inv.invoice_number}</p>
                      <p className="text-sm text-slate-500">Patient: {inv.patient_ref}</p>
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
            <Link to={createPageUrl('Patients')}>
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Register Patient
              </Button>
            </Link>
            <Link to={createPageUrl('Appointments')}>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </Link>
            <Button className="w-full justify-start" variant="outline" onClick={() => setShowInvoice(true)}>
              <Receipt className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Patient</label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} - {p.mrn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Invoice Items</label>
                <Button onClick={addLine} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line
                </Button>
              </div>

              {invoiceLines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <Select value={line.item_code} onValueChange={(v) => updateLine(index, 'item_code', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.service_code} value={s.service_code}>
                            {s.service_name} - ${s.default_price}
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
                      onChange={(e) => updateLine(index, 'qty', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value))}
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
              <Button variant="outline" onClick={() => setShowInvoice(false)}>Cancel</Button>
              <Button onClick={handleCreateInvoice} disabled={createInvoiceMutation.isPending}>
                Create & Collect Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}