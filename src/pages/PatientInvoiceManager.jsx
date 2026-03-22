import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Search, DollarSign, TrendingUp, Users, Loader2 } from 'lucide-react';
import InvoiceDetailDialog from '@/components/invoices/InvoiceDetailDialog';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-100 text-red-700',
  refunded: 'bg-orange-100 text-orange-700',
};

const PAYMENT_COLORS = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
};

export default function PatientInvoiceManager() {
  const { selectedOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoiceHeaders', selectedOrgId],
    queryFn: () => selectedOrgId
      ? base44.entities.InvoiceHeader.filter({ organization_id: selectedOrgId }, '-invoice_date', 200)
      : base44.entities.InvoiceHeader.list('-invoice_date', 200),
    enabled: true,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForInvoices', selectedOrgId],
    queryFn: () => selectedOrgId
      ? base44.entities.Patient.filter({ organization_id: selectedOrgId })
      : base44.entities.Patient.list(),
  });

  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

  // Sales summary per org (for platform owners with all orgs visible)
  const { data: orgs = [] } = useQuery({
    queryKey: ['orgsForInvoices'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o]));

  // Compute summary stats
  const totalRevenue = invoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const paidRevenue = invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const unpaidRevenue = invoices.filter(i => i.payment_status === 'unpaid').reduce((s, i) => s + (i.total || 0), 0);
  const uniquePatients = new Set(invoices.map(i => i.patient_ref)).size;

  // Filter
  const filtered = invoices.filter(inv => {
    const patient = patientMap[inv.patient_ref];
    const name = patient ? `${patient.first_name} ${patient.last_name}` : '';
    const matchSearch = !search ||
      (inv.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    setGeneratingPdf(invoiceId);
    try {
      const response = await fetch(`/api/functions/generateInvoicePDF`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('base44_token') || sessionStorage.getItem('base44_token')}` },
        body: JSON.stringify({ invoiceId }),
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber || invoiceId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('PDF generation failed: ' + e.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patient Invoice Manager</h1>
        <p className="text-slate-500 text-sm mt-1">View invoices, track revenue, and download branded PDF receipts with SOAP note summaries</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Invoiced</p>
                <p className="text-lg font-bold text-slate-900">LKR {totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Collected</p>
                <p className="text-lg font-bold text-green-700">LKR {paidRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className="text-lg font-bold text-red-600">LKR {unpaidRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Patients Billed</p>
                <p className="text-lg font-bold text-slate-900">{uniquePatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by invoice # or patient name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoices ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No invoices found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Invoice #</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Patient</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Date</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-semibold">Total</th>
                    <th className="text-center px-4 py-3 text-slate-600 font-semibold">Status</th>
                    <th className="text-center px-4 py-3 text-slate-600 font-semibold">Payment</th>
                    <th className="text-center px-4 py-3 text-slate-600 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const patient = patientMap[inv.patient_ref];
                    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Walk-in';
                    return (
                      <tr key={inv.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-teal-700 font-medium">
                          {inv.invoice_number || inv.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{patientName}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          LKR {(inv.total || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={STATUS_COLORS[inv.status] || STATUS_COLORS.draft}>
                            {inv.status || 'draft'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={PAYMENT_COLORS[inv.payment_status] || PAYMENT_COLORS.unpaid}>
                            {inv.payment_status || 'unpaid'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(inv)}>
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                              disabled={generatingPdf === inv.id}
                              className="text-teal-700 border-teal-300 hover:bg-teal-50"
                            >
                              {generatingPdf === inv.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5 mr-1" />}
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          patient={patientMap[selectedInvoice.patient_ref]}
          onClose={() => setSelectedInvoice(null)}
          onDownloadPdf={handleDownloadPdf}
          generatingPdf={generatingPdf}
        />
      )}
    </div>
  );
}