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
import { Pill, Check, X, Sparkles, Pencil, BanIcon } from 'lucide-react';
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

  const activeMeds = prescriptions.filter(p => p.status === 'Verified' || p.status === 'Dispensed' || p.status === 'New');

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
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900">{rx.drug_name}</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                      {rx.status}
                    </Badge>
                  </div>
                  {rx.strength && <p className="text-sm text-slate-600">Strength: {rx.strength}</p>}
                  {rx.directions && <p className="text-sm text-slate-600">Directions: {rx.directions}</p>}
                  {rx.quantity && <p className="text-sm text-slate-500">Quantity: {rx.quantity}</p>}
                  {rx.prescribed_date && (
                    <p className="text-xs text-slate-400 mt-1">
                      Prescribed: {format(new Date(rx.prescribed_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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