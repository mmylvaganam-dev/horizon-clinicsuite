import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Pill, Check, X, Sparkles, Pencil, BanIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function MedicationList({ patientId }) {
  const queryClient = useQueryClient();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editRx, setEditRx] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patientPrescriptions', patientId],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patientId }, '-prescribed_date'),
  });

  const { data: medSuggestions = [] } = useQuery({
    queryKey: ['medSuggestions', patientId],
    queryFn: () => base44.entities.MedReconSuggestion.filter({ patient_ref: patientId, status: 'pending' }),
    enabled: !!patientId
  });

  const acceptSuggestionMutation = useMutation({
    mutationFn: async (suggestion) => {
      const meds = suggestion.suggested_meds_json?.add_medications || [];
      for (const med of meds) {
        await base44.entities.Prescription.create({
          patient_id: patientId,
          prescriber_id: user?.id || '',
          drug_name: med.name,
          strength: med.dose || '',
          directions: med.frequency || '',
          quantity: 1,
          status: 'New',
          prescribed_date: new Date().toISOString(),
          notes: 'Added via Smart Summary suggestion'
        });
      }
      await base44.entities.MedReconSuggestion.update(suggestion.id, {
        status: 'accepted',
        reviewed_by: user?.id,
        reviewed_by_email: user?.email,
        reviewed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientPrescriptions', patientId] });
      queryClient.invalidateQueries({ queryKey: ['medSuggestions', patientId] });
      toast.success('Medications added');
    },
    onError: (e) => toast.error('Failed: ' + e.message)
  });

  const rejectSuggestionMutation = useMutation({
    mutationFn: (suggestionId) => base44.entities.MedReconSuggestion.update(suggestionId, {
      status: 'rejected',
      reviewed_by: user?.id,
      reviewed_by_email: user?.email,
      reviewed_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medSuggestions', patientId] });
      toast.success('Suggestion rejected');
    }
  });

  const updateRxMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Prescription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientPrescriptions', patientId] });
      toast.success('Medication updated');
      setEditRx(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message)
  });

  const deleteRxMutation = useMutation({
    mutationFn: (id) => base44.entities.Prescription.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientPrescriptions', patientId] });
      toast.success('Medication removed');
    },
    onError: (e) => toast.error('Failed: ' + e.message)
  });

  const openEdit = (rx) => {
    setEditRx(rx);
    setEditForm({
      drug_name: rx.drug_name,
      strength: rx.strength || '',
      directions: rx.directions || '',
      quantity: rx.quantity || '',
      refills: rx.refills || 0,
      notes: rx.notes || '',
      status: rx.status,
    });
  };

  const activeMeds = prescriptions.filter(p => p.status !== 'Cancelled');

  return (
    <div className="space-y-4">
      {medSuggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">
              {medSuggestions.length} medication suggestion{medSuggestions.length > 1 ? 's' : ''} from Smart Summary
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowSuggestions(true)}>
            Review
          </Button>
        </div>
      )}

      {activeMeds.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No current medications</p>
      ) : (
        <div className="space-y-2">
          {activeMeds.map((rx) => (
            <div key={rx.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-slate-900">{rx.drug_name}</p>
                    <Badge variant="outline" className={rx.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}>
                      {rx.status}
                    </Badge>
                  </div>
                  {rx.strength && <p className="text-sm text-slate-600">Dose: {rx.strength}</p>}
                  {rx.directions && <p className="text-sm text-slate-600">Directions: {rx.directions}</p>}
                  {rx.quantity && <p className="text-sm text-slate-500">Qty: {rx.quantity}{rx.refills > 0 ? ` · ${rx.refills} refill(s)` : ''}</p>}
                  {rx.prescribed_date && (
                    <p className="text-xs text-slate-400 mt-1">Prescribed: {format(new Date(rx.prescribed_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(rx)} title="Edit medication">
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                  {rx.status !== 'Cancelled' && (
                    <Button variant="ghost" size="sm" onClick={() => updateRxMutation.mutate({ id: rx.id, data: { status: 'Cancelled' } })} title="Mark as inactive">
                      <BanIcon className="w-4 h-4 text-amber-400" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete permanently"
                    onClick={() => {
                      if (window.confirm(`Delete "${rx.drug_name}" from this patient's medication list?`)) {
                        deleteRxMutation.mutate(rx.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Medication Dialog */}
      <Dialog open={!!editRx} onOpenChange={(o) => !o && setEditRx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Drug Name</Label>
              <Input value={editForm.drug_name || ''} onChange={e => setEditForm({ ...editForm, drug_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dose / Strength</Label>
                <Input value={editForm.strength || ''} onChange={e => setEditForm({ ...editForm, strength: e.target.value })} placeholder="e.g. 500mg" />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={editForm.quantity || ''} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Directions / Frequency</Label>
              <Input value={editForm.directions || ''} onChange={e => setEditForm({ ...editForm, directions: e.target.value })} placeholder="e.g. 1 tab twice daily after meals" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Refills</Label>
                <Input type="number" value={editForm.refills || 0} onChange={e => setEditForm({ ...editForm, refills: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Verified">Verified (Active)</SelectItem>
                    <SelectItem value="Dispensed">Dispensed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled (Inactive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Clinical notes" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditRx(null)}>Cancel</Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                disabled={updateRxMutation.isPending}
                onClick={() => updateRxMutation.mutate({ id: editRx.id, data: editForm })}
              >
                {updateRxMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Med Suggestions Review Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Medication Update Suggestions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
            {medSuggestions.map((sug) => (
              <div key={sug.id} className="border rounded-lg p-4 bg-amber-50 space-y-3">
                <Badge variant="outline">From: {sug.source_type}</Badge>
                <div>
                  <p className="font-semibold mb-2">Suggested Medications:</p>
                  {(sug.suggested_meds_json?.add_medications || []).map((med, idx) => (
                    <div key={idx} className="ml-4 mb-2">
                      <p className="font-medium">• {med.name}</p>
                      {med.dose && <p className="text-sm text-slate-600 ml-4">Dose: {med.dose}</p>}
                      {med.frequency && <p className="text-sm text-slate-600 ml-4">Frequency: {med.frequency}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptSuggestionMutation.mutate(sug)}
                    disabled={acceptSuggestionMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept & Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectSuggestionMutation.mutate(sug.id)}
                    disabled={rejectSuggestionMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}