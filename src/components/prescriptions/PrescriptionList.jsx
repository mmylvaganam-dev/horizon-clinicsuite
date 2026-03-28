import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Pill, Search, Edit2, XCircle, Send, CheckCircle, Clock, RefreshCw,
  Building2, AlertTriangle, ChevronDown, ChevronUp, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  New: 'bg-slate-100 text-slate-700',
  Verified: 'bg-teal-100 text-teal-800',
  Dispensed: 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-rose-100 text-rose-700',
};

const DELIVERY_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  received: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready: 'bg-teal-100 text-teal-700',
  delivered: 'bg-green-100 text-green-700',
};

export default function PrescriptionList({ patientId, patient, onEdit }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: () => patientId
      ? base44.entities.Prescription.filter({ patient_id: patientId }, '-prescribed_date', 100)
      : base44.entities.Prescription.list('-prescribed_date', 100),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Prescription.update(id, { status: 'Cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription cancelled');
    },
  });

  const resendMutation = useMutation({
    mutationFn: (rx) => base44.entities.Prescription.update(rx.id, {
      delivery_status: 'pending',
      delivery_sent_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Re-sent to pharmacy');
    },
  });

  const filtered = prescriptions.filter(rx => {
    const matchesSearch = !search || rx.drug_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <div className="text-center py-12 text-slate-400">Loading prescriptions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search drug name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="New">Draft</SelectItem>
            <SelectItem value="Verified">Signed</SelectItem>
            <SelectItem value="Dispensed">Dispensed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No prescriptions found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(rx => (
          <Card key={rx.id} className="border border-slate-200 shadow-none hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{rx.drug_name}</span>
                    {rx.strength && <span className="text-slate-500 text-sm">{rx.strength}</span>}
                    {rx.dosage_form && <span className="text-slate-400 text-xs">({rx.dosage_form})</span>}
                    <Badge className={`text-xs ${STATUS_COLORS[rx.status] || 'bg-slate-100'}`}>{rx.status}</Badge>
                    {rx.delivery_requested && rx.delivery_status && (
                      <Badge className={`text-xs ${DELIVERY_COLORS[rx.delivery_status] || 'bg-slate-100'}`}>
                        <Send className="w-3 h-3 mr-1" />
                        {rx.delivery_status}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mt-1">{rx.directions}</p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                    <span>Qty: <strong className="text-slate-600">{rx.quantity}</strong></span>
                    <span>Refills: <strong className="text-slate-600">{rx.refills}</strong></span>
                    {rx.prescribed_date && <span>Prescribed: {format(new Date(rx.prescribed_date), 'dd MMM yyyy')}</span>}
                    {rx.expiry_date && <span>Expires: {format(new Date(rx.expiry_date), 'dd MMM yyyy')}</span>}
                    {rx.target_pharmacy_name && (
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{rx.target_pharmacy_name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setExpandedId(expandedId === rx.id ? null : rx.id)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
                    {expandedId === rx.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {rx.status !== 'Cancelled' && rx.status !== 'Dispensed' && (
                    <>
                      <button onClick={() => onEdit(rx)} className="p-1.5 rounded hover:bg-teal-50 text-slate-400 hover:text-teal-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm('Cancel this prescription?')) cancelMutation.mutate(rx.id); }}
                        className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {rx.delivery_requested && rx.status === 'Verified' && (
                    <button onClick={() => resendMutation.mutate(rx)} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Re-send to pharmacy">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/PrescriptionPrint?id=${rx.id}`)}
                    className="p-1.5 rounded hover:bg-teal-50 text-slate-400 hover:text-teal-600"
                    title="Print prescription"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === rx.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-sm text-slate-600">
                  {rx.notes && <p><span className="font-medium text-slate-700">Notes: </span>{rx.notes}</p>}
                  {rx.prescriber_id && <p><span className="font-medium text-slate-700">Prescriber ID: </span>{rx.prescriber_id}</p>}
                  {rx.delivery_sent_at && (
                    <p><span className="font-medium text-slate-700">Sent to pharmacy: </span>
                      {format(new Date(rx.delivery_sent_at), 'dd MMM yyyy HH:mm')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}