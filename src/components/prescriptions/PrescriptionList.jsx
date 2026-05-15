import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pill, Search, Edit2, XCircle, Send, RefreshCw,
  Building2, ChevronDown, ChevronUp, Printer, Copy, FileText,
  Clock, CheckCircle2, AlertCircle, History
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
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

function RxCard({ rx, onEdit, expandedId, setExpandedId, cancelMutation, renewMutation, resendMutation, faxingId, setFaxingId, navigate, isPast }) {
  const isExpanded = expandedId === rx.id;

  const daysSince = rx.prescribed_date
    ? differenceInDays(new Date(), new Date(rx.prescribed_date))
    : null;

  const handleFax = () => {
    setFaxingId(rx.id);
    window.open(`/PrescriptionPrint?id=${rx.id}&fax=1`, '_blank');
    setFaxingId(null);
    toast.success('Prescription opened for fax/print');
  };

  return (
    <Card className={`border shadow-none transition-shadow hover:shadow-sm ${isPast ? 'border-slate-100 bg-slate-50/60' : 'border-slate-200 bg-white'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold ${isPast ? 'text-slate-600' : 'text-slate-900'}`}>{rx.drug_name}</span>
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

            <p className={`text-sm mt-1 ${isPast ? 'text-slate-500' : 'text-slate-600'}`}>{rx.directions}</p>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
              <span>Qty: <strong className="text-slate-600">{rx.quantity}</strong></span>
              <span>Refills: <strong className="text-slate-600">{rx.refills ?? 0}</strong></span>
              {rx.prescribed_date && (() => {
                try {
                  const d = new Date(rx.prescribed_date);
                  if (isNaN(d)) return null;
                  return (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(d, 'dd MMM yyyy')}
                      {daysSince !== null && daysSince > 0 && (
                        <span className={`ml-1 font-medium ${daysSince > 180 ? 'text-amber-500' : 'text-slate-400'}`}>
                          ({daysSince}d ago)
                        </span>
                      )}
                    </span>
                  );
                } catch { return null; }
              })()}
              {rx.expiry_date && (() => {
                try {
                  const d = new Date(rx.expiry_date);
                  if (isNaN(d)) return null;
                  const expired = d < new Date();
                  return (
                    <span className={`flex items-center gap-1 ${expired ? 'text-rose-500 font-medium' : ''}`}>
                      {expired ? <AlertCircle className="w-3 h-3" /> : null}
                      Exp: {format(d, 'dd MMM yyyy')}
                    </span>
                  );
                } catch { return null; }
              })()}
              {rx.target_pharmacy_name && (
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{rx.target_pharmacy_name}</span>
              )}
              {rx.prescriber_name && (
                <span className="text-slate-400">Dr. {rx.prescriber_name}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setExpandedId(isExpanded ? null : rx.id)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Active Rx actions */}
            {!isPast && (
              <>
                <button onClick={() => onEdit(rx)} className="p-1.5 rounded hover:bg-teal-50 text-slate-400 hover:text-teal-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm('Cancel this prescription?')) cancelMutation.mutate(rx.id); }}
                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600" title="Cancel">
                  <XCircle className="w-4 h-4" />
                </button>
                {rx.delivery_requested && rx.status === 'Verified' && (
                  <button onClick={() => resendMutation.mutate(rx)} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Re-send to pharmacy">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {/* Renew/Refill — prominent on past meds, subtle on active */}
            {(rx.status === 'Verified' || rx.status === 'Dispensed') && (
              isPast ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs border-teal-300 text-teal-700 hover:bg-teal-50 ml-1"
                  onClick={() => { if (confirm(`Renew "${rx.drug_name}"? A new draft prescription will be created.`)) renewMutation.mutate(rx); }}
                  disabled={renewMutation.isPending}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Renew
                </Button>
              ) : (
                <button
                  onClick={() => { if (confirm(`Renew "${rx.drug_name}"? A new Draft prescription will be created.`)) renewMutation.mutate(rx); }}
                  className="p-1.5 rounded hover:bg-green-50 text-slate-400 hover:text-green-600"
                  title="Renew / Refill"
                  disabled={renewMutation.isPending}
                >
                  <Copy className="w-4 h-4" />
                </button>
              )
            )}

            <button onClick={handleFax}
              className="p-1.5 rounded hover:bg-purple-50 text-slate-400 hover:text-purple-600"
              title="Fax / Print"
              disabled={faxingId === rx.id}>
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/PrescriptionPrint?id=${rx.id}`)}
              className="p-1.5 rounded hover:bg-teal-50 text-slate-400 hover:text-teal-600"
              title="Print">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-sm text-slate-600">
            {rx.notes && <p><span className="font-medium text-slate-700">Notes: </span>{rx.notes}</p>}
            {rx.prescriber_id && <p><span className="font-medium text-slate-700">Prescriber: </span>{rx.prescriber_name || rx.prescriber_id}</p>}
            {rx.prescriber_credentials && <p><span className="font-medium text-slate-700">Credentials: </span>{rx.prescriber_credentials}</p>}
            {rx.delivery_sent_at && (() => {
              try {
                const d = new Date(rx.delivery_sent_at);
                return isNaN(d) ? null : <p><span className="font-medium text-slate-700">Sent to pharmacy: </span>{format(d, 'dd MMM yyyy HH:mm')}</p>;
              } catch { return null; }
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrescriptionList({ patientId, patient, onEdit }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [faxingId, setFaxingId] = useState(null);
  const [showPastMeds, setShowPastMeds] = useState(true);

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: () => {
      if (patientId) return base44.entities.Prescription.filter({ patient_id: patientId }, '-prescribed_date', 100);
      return base44.entities.Prescription.list('-prescribed_date', 100);
    },
    enabled: !!patientId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Prescription.update(id, { status: 'Cancelled' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prescriptions'] }); toast.success('Prescription cancelled'); },
  });

  const renewMutation = useMutation({
    mutationFn: async (rx) => {
      const { id, created_date, updated_date, prescribed_date, status, delivery_status, delivery_sent_at, ...rest } = rx;
      return base44.entities.Prescription.create({
        ...rest,
        status: 'New',
        prescribed_date: new Date().toISOString(),
        refills: rx.refills || 0,
        notes: `Renewal of Rx from ${rx.prescribed_date ? format(new Date(rx.prescribed_date), 'dd MMM yyyy') : 'previous date'}`,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prescriptions'] }); toast.success('Renewal created as Draft — review and sign'); },
  });

  const resendMutation = useMutation({
    mutationFn: (rx) => base44.entities.Prescription.update(rx.id, { delivery_status: 'pending', delivery_sent_at: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prescriptions'] }); toast.success('Re-sent to pharmacy'); },
  });

  if (!patientId) return (
    <div className="text-center py-16 text-slate-400">
      <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No patient selected</p>
      <p className="text-sm mt-1">Open this page from a patient's chart to see their prescriptions.</p>
    </div>
  );

  if (isLoading) return <div className="text-center py-12 text-slate-400">Loading prescriptions...</div>;

  const sharedProps = { onEdit, expandedId, setExpandedId, cancelMutation, renewMutation, resendMutation, faxingId, setFaxingId, navigate };

  // Split into active (New/Verified) and past (Dispensed/Cancelled)
  const searchLower = search.toLowerCase();
  const allFiltered = prescriptions.filter(rx => !search || rx.drug_name?.toLowerCase().includes(searchLower));

  const activeRx = allFiltered.filter(rx => rx.status === 'New' || rx.status === 'Verified');
  const pastRx = allFiltered.filter(rx => rx.status === 'Dispensed' || rx.status === 'Cancelled');

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search drug name..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Active Prescriptions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
          <h3 className="font-semibold text-slate-800">Active Prescriptions</h3>
          <Badge className="bg-teal-100 text-teal-700 text-xs">{activeRx.length}</Badge>
        </div>

        {activeRx.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
            <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active prescriptions</p>
          </div>
        ) : (
          activeRx.map(rx => <RxCard key={rx.id} rx={rx} isPast={false} {...sharedProps} />)
        )}
      </div>

      {/* Past Medications */}
      {pastRx.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowPastMeds(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-600">Past Medications</h3>
            <Badge className="bg-slate-100 text-slate-500 text-xs">{pastRx.length}</Badge>
            <span className="ml-auto text-xs text-slate-400">{showPastMeds ? 'Hide' : 'Show'}</span>
            {showPastMeds ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showPastMeds && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Copy className="w-3 h-3" />
                Click <strong>Renew</strong> on any past medication to create a new draft prescription for review and signing.
              </p>
              {pastRx.map(rx => <RxCard key={rx.id} rx={rx} isPast={true} {...sharedProps} />)}
            </div>
          )}
        </div>
      )}

      {allFiltered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No prescriptions found</p>
        </div>
      )}
    </div>
  );
}