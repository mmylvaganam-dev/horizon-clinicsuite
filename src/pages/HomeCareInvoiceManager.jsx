import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Printer, FileText, Trash2, X, 
  Home, Package, TestTube, MoreHorizontal, User, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useOrganization } from '@/components/OrganizationProvider';

const LINE_TYPES = [
  { value: 'home_service', label: 'Home Service', icon: Home },
  { value: 'pharmacy_supply', label: 'Pharmacy Supply', icon: Package },
  { value: 'lab_test', label: 'Lab Test', icon: TestTube },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

const COMMON_SERVICES = [
  'Catheter Change', 'Wound Dressing', 'NG Tube Change', 'IV Infusion',
  'Blood Pressure Monitoring', 'Blood Sugar Monitoring', 'Medication Administration',
  'Physiotherapy Session', 'Suture Removal', 'Injection'
];

export default function HomeCareInvoiceManager() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showLinesDialog, setShowLinesDialog] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const emptyForm = {
    patient_id: '', patient_name: '', patient_phone: '', patient_address: '',
    service_from: '', service_to: '', daily_rate: 3500, num_days: 0,
    payment_method: 'cash', notes: '', status: 'draft'
  };
  const [form, setForm] = useState(emptyForm);

  const emptyLine = { line_type: 'home_service', description: '', service_date: format(new Date(), 'yyyy-MM-dd'), qty: 1, unit_price: '' };
  const [lineForm, setLineForm] = useState(emptyLine);

  // Queries
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date'),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['homeCareSchedulesForInvoice', selectedOrgId],
    queryFn: () => base44.entities.HomeCareSchedule.filter({ status: 'completed' }, '-start_datetime', 200),
    enabled: showCreateDialog,
  });

  const { data: staffForInvoice = [] } = useQuery({
    queryKey: ['staffForInvoice', selectedOrgId],
    queryFn: () => base44.entities.StaffProfile.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['homeCareInvoices', selectedOrgId],
    queryFn: () => base44.entities.HomeCareInvoice.filter({ organization_id: selectedOrgId }, '-created_date'),
    enabled: !!selectedOrgId,
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['homeCareInvoiceLines', selectedInvoice?.id],
    queryFn: () => base44.entities.HomeCareInvoiceLine.filter({ invoice_id: selectedInvoice?.id }),
    enabled: !!selectedInvoice?.id,
  });

  // Auto-calculate days when dates change
  const calcDays = (from, to) => {
    if (!from || !to) return 0;
    const d = differenceInDays(parseISO(to), parseISO(from)) + 1;
    return d > 0 ? d : 0;
  };

  const handleDateChange = (field, value) => {
    const updated = { ...form, [field]: value };
    updated.num_days = calcDays(
      field === 'service_from' ? value : form.service_from,
      field === 'service_to' ? value : form.service_to
    );
    setForm(updated);
  };

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (data) => {
      const num = data.num_days || 0;
      const dailySub = (data.daily_rate || 0) * num;
      const invNum = `HCI-${Date.now().toString().slice(-6)}`;
      return base44.entities.HomeCareInvoice.create({
        ...data,
        organization_id: selectedOrgId,
        invoice_number: invNum,
        daily_subtotal: dailySub,
        items_subtotal: 0,
        grand_total: dailySub,
        amount_paid: 0,
        issued_at: new Date().toISOString(),
      });
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['homeCareInvoices'] });
      setShowCreateDialog(false);
      setForm(emptyForm);
      setSelectedInvoice(inv);
      setShowLinesDialog(true);
      toast.success('Invoice created! Add line items below.');
    },
  });

  // Add line item mutation
  const addLine = useMutation({
    mutationFn: async (line) => {
      const total = (line.qty || 1) * (parseFloat(line.unit_price) || 0);
      const created = await base44.entities.HomeCareInvoiceLine.create({
        ...line,
        invoice_id: selectedInvoice.id,
        organization_id: selectedOrgId,
        qty: parseFloat(line.qty) || 1,
        unit_price: parseFloat(line.unit_price) || 0,
        line_total: total,
      });
      // Recalc invoice totals
      const allLines = await base44.entities.HomeCareInvoiceLine.filter({ invoice_id: selectedInvoice.id });
      const itemsSub = allLines.reduce((s, l) => s + (l.line_total || 0), 0);
      const grand = (selectedInvoice.daily_subtotal || 0) + itemsSub;
      await base44.entities.HomeCareInvoice.update(selectedInvoice.id, { items_subtotal: itemsSub, grand_total: grand });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareInvoiceLines'] });
      queryClient.invalidateQueries({ queryKey: ['homeCareInvoices'] });
      // Refresh selected invoice
      base44.entities.HomeCareInvoice.filter({ id: selectedInvoice.id }).then(r => r[0] && setSelectedInvoice(r[0]));
      setLineForm(emptyLine);
      toast.success('Line item added');
    },
  });

  // Delete line mutation
  const deleteLine = useMutation({
    mutationFn: async (lineId) => {
      await base44.entities.HomeCareInvoiceLine.delete(lineId);
      const remaining = await base44.entities.HomeCareInvoiceLine.filter({ invoice_id: selectedInvoice.id });
      const itemsSub = remaining.reduce((s, l) => s + (l.line_total || 0), 0);
      const grand = (selectedInvoice.daily_subtotal || 0) + itemsSub;
      await base44.entities.HomeCareInvoice.update(selectedInvoice.id, { items_subtotal: itemsSub, grand_total: grand });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareInvoiceLines'] });
      queryClient.invalidateQueries({ queryKey: ['homeCareInvoices'] });
      base44.entities.HomeCareInvoice.filter({ id: selectedInvoice.id }).then(r => r[0] && setSelectedInvoice(r[0]));
    },
  });

  // Update invoice status
  const updateStatus = useMutation({
    mutationFn: ({ id, status, amount_paid }) => base44.entities.HomeCareInvoice.update(id, { status, amount_paid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareInvoices'] });
      toast.success('Invoice updated');
    },
  });

  const handlePrint = async (inv) => {
    try {
      const res = await base44.functions.invoke('generateHomeCareInvoice', { invoiceId: inv.id });
      const html = res.data;
      const win = window.open('', '_blank', 'width=400,height=700');
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    } catch (e) {
      toast.error('Failed to generate invoice');
    }
  };

  const filteredPatients = patients.filter(p => {
    const q = patientSearch.toLowerCase();
    return q && (p.first_name?.toLowerCase().includes(q) || p.last_name?.toLowerCase().includes(q) || p.phone?.includes(q) || p.phn?.toLowerCase().includes(q));
  });

  // Schedules matching the selected patient
  const patientSchedules = form.patient_id
    ? schedules.filter(s => s.patient_id === form.patient_id)
    : [];

  const getStaffName = (staffId) => {
    const s = staffForInvoice.find(x => x.id === staffId);
    return s ? `${s.first_name} ${s.last_name}` : staffId;
  };

  const populateFromSchedule = (schedule) => {
    const startDate = schedule.start_datetime
      ? schedule.start_datetime.split('T')[0]
      : schedule.schedule_date;
    const endDate = schedule.end_datetime
      ? schedule.end_datetime.split('T')[0]
      : schedule.schedule_date;
    const days = calcDays(startDate, endDate);
    setForm(prev => ({
      ...prev,
      service_from: startDate,
      service_to: endDate,
      num_days: days,
      notes: prev.notes || (schedule.notes || ''),
    }));
    setScheduleSearch('');
  };

  const filteredInvoices = invoices.filter(inv => {
    const q = search.toLowerCase();
    return !q || inv.patient_name?.toLowerCase().includes(q) || inv.invoice_number?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Home Care Invoices</h1>
          <p className="text-slate-500 mt-1">Bill patients for home care services, supplies, and daily charges</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: invoices.length, color: 'text-slate-700' },
          { label: 'Draft', value: invoices.filter(i => i.status === 'draft').length, color: 'text-slate-500' },
          { label: 'Issued', value: invoices.filter(i => i.status === 'issued').length, color: 'text-blue-600' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: 'text-emerald-600' },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search by patient name or invoice number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-slate-400 text-center py-8">Loading...</p>
        ) : filteredInvoices.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No invoices yet. Click "New Invoice" to get started.</p>
          </Card>
        ) : filteredInvoices.map(inv => (
          <Card key={inv.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-slate-900">{inv.invoice_number}</span>
                    <Badge className={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{inv.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{inv.service_from} → {inv.service_to} ({inv.num_days} days)</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">Rs {(inv.grand_total || 0).toLocaleString()}</p>
                  {inv.amount_paid > 0 && (
                    <p className="text-xs text-emerald-600">Paid: Rs {(inv.amount_paid || 0).toLocaleString()}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setShowLinesDialog(true); }}>
                  <Plus className="w-3 h-3 mr-1" /> Add Items
                </Button>
                <Button size="sm" variant="outline" onClick={() => handlePrint(inv)}>
                  <Printer className="w-3 h-3 mr-1" /> Print
                </Button>
                {inv.status === 'draft' && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus.mutate({ id: inv.id, status: 'issued', amount_paid: inv.amount_paid })}>
                    Issue Invoice
                  </Button>
                )}
                {(inv.status === 'issued' || inv.status === 'partial') && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus.mutate({ id: inv.id, status: 'paid', amount_paid: inv.grand_total })}>
                    Mark Paid
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Home Care Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Patient Search */}
            <div>
              <Label>Search Patient *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Type name or phone..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="pl-10" />
              </div>
              {filteredPatients.length > 0 && (
                <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-white shadow-lg z-10">
                  {filteredPatients.map(p => (
                    <div key={p.id} className="p-2 hover:bg-slate-50 cursor-pointer border-b last:border-0"
                      onClick={() => {
                        setForm({ ...form, patient_id: p.id, patient_name: `${p.first_name} ${p.last_name}`, patient_phone: p.phone || '', patient_address: p.address || '' });
                        setPatientSearch('');
                      }}>
                      <p className="font-medium text-sm">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-500">{p.phone}{p.phn ? ` · ${p.phn}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
              {form.patient_name && (
                <div className="mt-2 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <span className="font-medium text-teal-800 text-sm">{form.patient_name}</span>
                  <span className="text-teal-600 text-xs">{form.patient_phone}</span>
                  <button onClick={() => setForm({ ...form, patient_id: '', patient_name: '', patient_phone: '', patient_address: '' })} className="ml-auto text-teal-500 hover:text-teal-700"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {/* Auto-fill from Schedule */}
            {form.patient_id && patientSchedules.length > 0 && (
              <div className="border border-teal-200 rounded-lg p-3 bg-teal-50 space-y-2">
                <p className="text-xs font-semibold text-teal-700">📅 Load from Completed Schedule</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {patientSchedules.map(s => {
                    const startDT = s.start_datetime ? new Date(s.start_datetime) : null;
                    const endDT = s.end_datetime ? new Date(s.end_datetime) : null;
                    const startLabel = startDT ? format(startDT, 'dd MMM yyyy HH:mm') : s.schedule_date;
                    const endLabel = endDT ? format(endDT, 'dd MMM yyyy HH:mm') : '';
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:border-teal-400 hover:bg-teal-50 text-sm transition-colors"
                        onClick={() => populateFromSchedule(s)}
                      >
                        <span className="font-medium text-teal-800">{startLabel}</span>
                        {endLabel && <span className="text-slate-500"> → {endLabel}</span>}
                        <span className="ml-2 text-xs text-slate-400">{s.service_type} · {getStaffName(s.staff_id)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Service Period */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Service From *</Label>
                <Input type="date" value={form.service_from} onChange={e => handleDateChange('service_from', e.target.value)} />
              </div>
              <div>
                <Label>Service To *</Label>
                <Input type="date" value={form.service_to} onChange={e => handleDateChange('service_to', e.target.value)} />
              </div>
              <div>
                <Label>Days</Label>
                <Input type="number" value={form.num_days} onChange={e => setForm({ ...form, num_days: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Daily Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Daily Rate (LKR)</Label>
                <Input type="number" value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end">
                <div className="bg-slate-50 border rounded-lg p-3 flex-1 text-center">
                  <p className="text-xs text-slate-500">Daily Subtotal</p>
                  <p className="font-bold text-slate-800">Rs {((form.daily_rate || 0) * (form.num_days || 0)).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['cash', 'card', 'bank_transfer', 'cheque', 'credit'].map(m => (
                      <SelectItem key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['draft', 'issued', 'paid'].map(s => (
                      <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notes..." />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!form.patient_id) { toast.error('Please select a patient'); return; }
                if (!form.service_from || !form.service_to) { toast.error('Please set service dates'); return; }
                createInvoice.mutate(form);
              }} disabled={createInvoice.isPending}>
                {createInvoice.isPending ? 'Creating...' : 'Create Invoice & Add Items'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Line Items Dialog */}
      <Dialog open={showLinesDialog} onOpenChange={setShowLinesDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice?.invoice_number} — {selectedInvoice?.patient_name}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 mt-2">
              {/* Invoice Summary */}
              <div className="bg-slate-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-slate-500 text-xs">Period</p>
                  <p className="font-medium">{selectedInvoice.service_from} → {selectedInvoice.service_to}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Daily ({selectedInvoice.num_days}d × Rs {selectedInvoice.daily_rate})</p>
                  <p className="font-medium">Rs {(selectedInvoice.daily_subtotal || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Grand Total</p>
                  <p className="font-bold text-lg text-teal-700">Rs {(selectedInvoice.grand_total || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Add Line Form */}
              <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                <p className="font-semibold text-sm text-slate-700">Add Service / Supply</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={lineForm.line_type} onValueChange={v => setLineForm({ ...lineForm, line_type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LINE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" className="h-9" value={lineForm.service_date} onChange={e => setLineForm({ ...lineForm, service_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <div className="relative">
                    <Input className="h-9" value={lineForm.description} onChange={e => setLineForm({ ...lineForm, description: e.target.value })} placeholder="e.g. Catheter Change, Wound Dressing..." />
                  </div>
                  {/* Common service quick-add */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {COMMON_SERVICES.slice(0, 6).map(s => (
                      <button key={s} type="button" className="text-xs px-2 py-0.5 bg-white border rounded-full text-slate-600 hover:bg-teal-50 hover:border-teal-400 transition-colors"
                        onClick={() => setLineForm({ ...lineForm, description: s })}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" className="h-9" value={lineForm.qty} onChange={e => setLineForm({ ...lineForm, qty: e.target.value })} min={1} />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price (LKR)</Label>
                    <Input type="number" className="h-9" value={lineForm.unit_price} onChange={e => setLineForm({ ...lineForm, unit_price: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="flex items-end">
                    <div className="bg-white border rounded-lg h-9 px-3 flex items-center w-full text-sm font-medium text-slate-700">
                      Rs {((parseFloat(lineForm.qty) || 1) * (parseFloat(lineForm.unit_price) || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={() => {
                  if (!lineForm.description || !lineForm.unit_price) { toast.error('Please fill description and price'); return; }
                  addLine.mutate(lineForm);
                }} disabled={addLine.isPending}>
                  <Plus className="w-3 h-3 mr-1" /> {addLine.isPending ? 'Adding...' : 'Add to Invoice'}
                </Button>
              </div>

              {/* Existing Lines */}
              {invoiceLines.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm text-slate-700">Added Items ({invoiceLines.length})</p>
                  {invoiceLines.map(line => (
                    <div key={line.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{LINE_TYPES.find(t => t.value === line.line_type)?.label || line.line_type}</Badge>
                          <span className="font-medium text-sm">{line.description}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{line.service_date} · {line.qty} × Rs {(line.unit_price || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Rs {(line.line_total || 0).toLocaleString()}</span>
                        <button onClick={() => deleteLine.mutate(line.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex justify-between items-center">
                    <span className="font-semibold text-teal-800">Items Subtotal</span>
                    <span className="font-bold text-teal-800">Rs {(selectedInvoice.items_subtotal || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Total & Actions */}
              <div className="border-t pt-4 flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900">Rs {(selectedInvoice.grand_total || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Grand Total</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handlePrint(selectedInvoice)}>
                    <Printer className="w-4 h-4 mr-1" /> Print Invoice
                  </Button>
                  <Button onClick={() => setShowLinesDialog(false)}>Done</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}