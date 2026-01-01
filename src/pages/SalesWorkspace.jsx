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
  const [searchType, setSearchType] = useState('service');
  const [itemSearch, setItemSearch] = useState('');
  const [cashReceived, setCashReceived] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.ServiceCatalog.filter({ active: true }),
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['healthPackages'],
    queryFn: () => base44.entities.HealthPackage.filter({ active: true }),
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
      const accessionNumber = `ACC-${Date.now()}`;
      const subtotal = data.lines.reduce((sum, l) => sum + l.line_total, 0);
      const discountAmount = data.discount || 0;
      const taxableAmount = subtotal - discountAmount;
      const taxTotal = 0;
      const total = taxableAmount + taxTotal;

      const patient = patients.find(p => p.id === data.patient_ref);

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
        notes: `Accession: ${accessionNumber} | Patient: ${patient?.first_name} ${patient?.last_name} | MRN: ${patient?.mrn}${data.discount_reason ? ` | Discount: ${data.discount} - ${data.discount_reason}` : ''}${data.payment_method === 'cash' && data.cash_received ? ` | Cash: Rs. ${data.cash_received} | Change: Rs. ${(data.cash_received - total).toFixed(2)}` : ''}`
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
        metadata: {
          invoice_number: invoiceNumber,
          accession_number: accessionNumber,
          patient_name: `${patient?.first_name} ${patient?.last_name}`,
          mrn: patient?.mrn,
          total,
          payment_method: data.payment_method,
          cash_received: data.cash_received,
          change_given: data.payment_method === 'cash' && data.cash_received ? (data.cash_received - total).toFixed(2) : 0
        }
      });

      return { invoice, accessionNumber };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries(['todayInvoices']);
      
      // Generate and download PDF receipt
      try {
        const response = await base44.functions.invoke('generateReceiptPDF', { invoice_id: data.invoice.id });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${data.invoice.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success(`Sale completed! Receipt downloaded. Accession: ${data.accessionNumber}`);
      } catch (error) {
        toast.success(`Sale completed! Accession: ${data.accessionNumber}`);
        console.error('PDF generation failed:', error);
      }
      
      setShowSale(false);
      setSelectedPatient('');
      setSaleLines([]);
      setDiscount(0);
      setDiscountReason('');
      setCashReceived(0);
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

  const addPackage = (pkg) => {
    const packageLine = {
      item_code: pkg.package_code,
      item_name_cache: pkg.package_name,
      category: 'PACKAGE',
      qty: 1,
      unit_price: pkg.total_price,
      line_total: pkg.total_price
    };
    setSaleLines([...saleLines, packageLine]);
    setItemSearch('');
    toast.success(`Added ${pkg.package_name}`);
  };

  const addService = (service) => {
    const serviceLine = {
      item_code: service.service_code,
      item_name_cache: service.service_name,
      category: service.category,
      qty: 1,
      unit_price: service.default_price,
      line_total: service.default_price
    };
    setSaleLines([...saleLines, serviceLine]);
    setItemSearch('');
    toast.success(`Added ${service.service_name}`);
  };

  const filteredItems = itemSearch
    ? searchType === 'package'
      ? packages.filter(p => p.package_name.toLowerCase().includes(itemSearch.toLowerCase()) || p.package_code.includes(itemSearch))
      : services.filter(s => s.service_name.toLowerCase().includes(itemSearch.toLowerCase()) || s.service_code.toLowerCase().includes(itemSearch.toLowerCase()))
    : [];

  const handleCreateSale = () => {
    if (!selectedPatient || saleLines.length === 0) {
      toast.error('Please select patient and add items');
      return;
    }
    if (discount > 0 && !discountReason) {
      toast.error('Please provide discount reason');
      return;
    }
    if (paymentMethod === 'cash' && cashReceived < total) {
      toast.error('Cash received is less than total amount');
      return;
    }
    createSaleMutation.mutate({
      patient_ref: selectedPatient,
      lines: saleLines,
      payment_method: paymentMethod,
      discount,
      discount_reason: discountReason,
      cash_received: cashReceived
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
  const taxTotal = 0;
  const total = taxableAmount + taxTotal;

  const todayTotal = todayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const todayCount = todayInvoices.length;
  const changeAmount = paymentMethod === 'cash' && cashReceived > 0 ? cashReceived - total : 0;

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
                <p className="text-2xl font-bold">Rs. {todayTotal.toFixed(2)}</p>
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
                  Rs. {todayCount > 0 ? (todayTotal / todayCount).toFixed(2) : '0.00'}
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
                      <p className="font-bold text-emerald-600">Rs. {inv.total.toFixed(2)}</p>
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
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-2 flex-1">
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Tests</SelectItem>
                      <SelectItem value="package">Packages</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder={searchType === 'package' ? 'Search packages...' : 'Search tests...'}
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {!itemSearch && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  {searchType === 'package'
                    ? `${packages.length} packages available - start typing to search`
                    : `${services.length} tests available - start typing to search`
                  }
                </div>
              )}

              {itemSearch && filteredItems.length === 0 && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  No {searchType === 'package' ? 'packages' : 'tests'} found matching "{itemSearch}"
                  {searchType === 'service' && services.length === 0 && ' - No tests in catalog. Add tests in Admin → Service Catalog.'}
                  {searchType === 'package' && packages.length === 0 && ' - No packages in catalog. Add packages in Pricing & Catalogs.'}
                </div>
              )}

              {itemSearch && filteredItems.length > 0 && (
                <div className="mb-3 max-h-48 overflow-y-auto border rounded-lg">
                  {searchType === 'package'
                    ? filteredItems.map(pkg => (
                        <div
                          key={pkg.id}
                          className="p-3 hover:bg-teal-50 cursor-pointer border-b last:border-0"
                          onClick={() => addPackage(pkg)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">{pkg.package_name}</p>
                              <p className="text-xs text-slate-500">Code: {pkg.package_code}</p>
                              {pkg.items_json && (
                                <p className="text-xs text-slate-400 mt-1">{pkg.items_json.length} tests included</p>
                              )}
                            </div>
                            <p className="font-bold text-teal-600">Rs. {pkg.total_price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    : filteredItems.map(svc => (
                        <div
                          key={svc.id}
                          className="p-3 hover:bg-teal-50 cursor-pointer border-b last:border-0"
                          onClick={() => addService(svc)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">{svc.service_name}</p>
                              <p className="text-xs text-slate-500">{svc.category} • {svc.service_code}</p>
                            </div>
                            <p className="font-bold text-teal-600">Rs. {svc.default_price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                  }
                </div>
              )}

              <div className="mb-2">
                <label className="text-sm font-medium">Selected Items</label>
              </div>

              {saleLines.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-slate-500">Search and add packages or tests above</p>
                </div>
              )}

              {saleLines.map((line, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{line.item_name_cache}</p>
                    <p className="text-xs text-slate-500">{line.category} • {line.item_code}</p>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      value={line.qty}
                      onChange={(e) => updateLine(index, 'qty', parseFloat(e.target.value) || 1)}
                      className="text-center"
                    />
                  </div>
                  <div className="w-28">
                    <p className="text-sm text-slate-600">Rs. {line.unit_price.toFixed(2)}</p>
                  </div>
                  <div className="w-28 text-right">
                    <p className="font-bold text-teal-600">Rs. {line.line_total.toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3 bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">Rs. {subtotal.toFixed(2)}</span>
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
                  <span>-Rs. {discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-emerald-600">Rs. {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); if (v !== 'cash') setCashReceived(0); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card (Credit/Debit)</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="text-sm font-medium">Cash Received</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="text-lg font-semibold"
                  />
                  {cashReceived > 0 && (
                    <p className={`text-sm mt-1 ${cashReceived >= total ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {cashReceived >= total 
                        ? `Change: Rs. ${(cashReceived - total).toFixed(2)}`
                        : `Short: Rs. ${(total - cashReceived).toFixed(2)}`
                      }
                    </p>
                  )}
                </div>
              )}
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