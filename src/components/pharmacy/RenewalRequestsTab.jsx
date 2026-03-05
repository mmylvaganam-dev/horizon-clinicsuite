import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, RefreshCw, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function RenewalRequestsTab({ selectedOrgId }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [pharmacistNotes, setPharmacistNotes] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['renewalRequests', selectedOrgId],
    queryFn: () => base44.entities.PrescriptionRenewalRequest.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const openReview = (req) => {
    setSelected(req);
    setPharmacistNotes('');
  };

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      // Create new Prescription based on original
      const original = await base44.entities.Prescription.filter({ id: req.original_prescription_id }).then(r => r[0]);
      const newRx = await base44.entities.Prescription.create({
        organization_id: req.organization_id,
        location_id: original?.location_id,
        patient_id: req.patient_id,
        prescriber_id: original?.prescriber_id,
        drug_name: req.drug_name,
        strength: req.strength,
        dosage_form: req.dosage_form,
        directions: req.directions,
        quantity: req.quantity_requested,
        notes: `Renewal of prescription. ${pharmacistNotes}`.trim(),
        prescribed_date: new Date().toISOString(),
        status: 'New',
      });
      // Update the renewal request
      return base44.entities.PrescriptionRenewalRequest.update(req.id, {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        pharmacist_notes: pharmacistNotes,
        new_prescription_id: newRx.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renewalRequests'] });
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Renewal approved — new prescription created');
      setSelected(null);
    },
  });

  const denyMutation = useMutation({
    mutationFn: (req) => base44.entities.PrescriptionRenewalRequest.update(req.id, {
      status: 'denied',
      reviewed_at: new Date().toISOString(),
      pharmacist_notes: pharmacistNotes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renewalRequests'] });
      toast.success('Renewal request denied');
      setSelected(null);
    },
  });

  const statusStyle = {
    pending: 'bg-amber-100 text-amber-700 border-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    denied: 'bg-rose-100 text-rose-700 border-rose-300',
  };

  const viaStyle = { portal: 'bg-blue-100 text-blue-700', staff: 'bg-slate-100 text-slate-600' };

  if (isLoading) return <p className="text-slate-400 text-sm p-4">Loading…</p>;

  return (
    <div className="space-y-4">
      {pending.length === 0 && resolved.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No renewal requests</p>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Pending ({pending.length})</h3>
          {pending.map(req => (
            <Card key={req.id} className="border-l-4 border-amber-400">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusStyle[req.status]}>{req.status}</Badge>
                    <Badge className={`${viaStyle[req.requested_via]} border-0 text-xs`}>
                      via {req.requested_via}
                    </Badge>
                    <span className="text-xs text-slate-400">{format(new Date(req.created_date), 'MMM d, h:mm a')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-900 text-sm">{req.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-700 text-sm">{req.drug_name} {req.strength} × {req.quantity_requested}</span>
                  </div>
                  {req.patient_notes && (
                    <p className="text-xs text-slate-500 italic">"{req.patient_notes}"</p>
                  )}
                </div>
                <Button size="sm" onClick={() => openReview(req)}>Review</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Resolved</h3>
          {resolved.map(req => (
            <Card key={req.id} className="opacity-70">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusStyle[req.status]}>{req.status}</Badge>
                    <span className="text-sm text-slate-700">{req.drug_name} {req.strength} × {req.quantity_requested}</span>
                    <span className="text-xs text-slate-400">— {req.patient_name}</span>
                  </div>
                  {req.pharmacist_notes && (
                    <p className="text-xs text-slate-500 mt-1">Note: {req.pharmacist_notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600" /> Review Renewal Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium">Patient:</span> {selected.patient_name}</p>
                <p><span className="font-medium">Drug:</span> {selected.drug_name} {selected.strength}</p>
                <p><span className="font-medium">Qty Requested:</span> {selected.quantity_requested} (original: {selected.original_quantity})</p>
                <p><span className="font-medium">Directions:</span> {selected.directions}</p>
                {selected.patient_notes && (
                  <p><span className="font-medium">Patient Notes:</span> {selected.patient_notes}</p>
                )}
                <p><span className="font-medium">Requested via:</span> {selected.requested_via} on {format(new Date(selected.created_date), 'MMM d, yyyy')}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Pharmacist Notes (optional)</label>
                <Textarea
                  className="mt-1"
                  placeholder="Reason for approval/denial, counselling notes…"
                  value={pharmacistNotes}
                  onChange={e => setPharmacistNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(selected)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {approveMutation.isPending ? 'Approving…' : 'Approve & Create Rx'}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  disabled={denyMutation.isPending}
                  onClick={() => denyMutation.mutate(selected)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}