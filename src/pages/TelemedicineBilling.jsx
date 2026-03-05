import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Clock, CheckCircle, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  invoiced: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  waived: 'bg-slate-100 text-slate-600',
  refunded: 'bg-red-100 text-red-800',
};

export default function TelemedicineBilling() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const { data: billingRecords = [], isLoading } = useQuery({
    queryKey: ['teleConsultationBilling'],
    queryFn: () => base44.entities.TeleConsultationBilling.list('-created_date', 200),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TeleConsultationBilling.update(id, { status, ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['teleConsultationBilling']);
      toast.success('Billing status updated');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const filtered = billingRecords.filter(r => {
    const statusOk = filterStatus === 'all' || r.status === filterStatus;
    const monthOk = filterMonth === 'all' || r.consultation_date?.startsWith(filterMonth);
    return statusOk && monthOk;
  });

  const totalRevenue = filtered.reduce((s, r) => s + (r.amount_usd || 0), 0);
  const paidRevenue = filtered.filter(r => r.status === 'paid').reduce((s, r) => s + (r.amount_usd || 0), 0);
  const pendingRevenue = filtered.filter(r => r.status === 'pending').reduce((s, r) => s + (r.amount_usd || 0), 0);

  // Get unique months
  const months = [...new Set(billingRecords.map(r => r.consultation_date?.slice(0, 7)).filter(Boolean))].sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Telemedicine Billing</h1>
          <p className="text-slate-500 mt-1">$50 USD per completed consultation</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Billed', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Collected', value: `$${paidRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending', value: `$${pendingRevenue.toLocaleString()}`, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Total Consults', value: filtered.length, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <Card key={i} className={`border ${s.bg}`}>
            <CardContent className="p-4">
              <s.icon className={`w-8 h-8 ${s.color} mb-2`} />
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Billing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Billing Records ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No billing records found. Records are auto-created when consultations complete.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Region</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">{record.patient_name}</p>
                        <p className="text-xs text-slate-400">{record.patient_email}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{record.consultation_date}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">{record.appointment_type || 'CONSULTATION'}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{record.patient_region || '-'}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">${record.amount_usd}</td>
                      <td className="py-3 pr-4">
                        <Badge className={STATUS_COLORS[record.status] || STATUS_COLORS.pending}>{record.status}</Badge>
                      </td>
                      <td className="py-3">
                        {record.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-xs h-7"
                              onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'invoiced' })}>
                              Invoice
                            </Button>
                            <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700"
                              onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'paid' })}>
                              Mark Paid
                            </Button>
                          </div>
                        )}
                        {record.status === 'invoiced' && (
                          <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700"
                            onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'paid' })}>
                            Mark Paid
                          </Button>
                        )}
                        {record.status === 'paid' && <span className="text-green-600 text-xs font-medium">✓ Paid</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}