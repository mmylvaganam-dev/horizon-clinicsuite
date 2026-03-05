import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, Send, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function SendToPharmacyDialog({ patient, open, onOpenChange }) {
  const qc = useQueryClient();
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(patient?.preferred_pharmacy_org_id || '');
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState([]);

  const { data: orgs = [] } = useQuery({
    queryKey: ['pharmacyOrgs'],
    queryFn: () => base44.entities.Organization.filter({ type: 'pharmacy', status: 'active' }),
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patientPrescriptions', patient?.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-prescribed_date'),
    enabled: !!patient?.id && open,
  });

  // Only show active (New/Verified) prescriptions not already sent
  const eligible = prescriptions.filter(p =>
    (p.status === 'New' || p.status === 'Verified') && !p.delivery_requested
  );

  const togglePrescription = (id) => {
    setSelectedPrescriptionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const pharmacyOrg = orgs.find(o => o.id === selectedPharmacyId);
      const now = new Date().toISOString();
      await Promise.all(
        selectedPrescriptionIds.map(id =>
          base44.entities.Prescription.update(id, {
            delivery_requested: true,
            target_pharmacy_org_id: selectedPharmacyId,
            target_pharmacy_name: pharmacyOrg?.name || '',
            delivery_status: 'pending',
            delivery_sent_at: now,
          })
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patientPrescriptions', patient?.id] });
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success(`${selectedPrescriptionIds.length} prescription(s) sent to pharmacy!`);
      setSelectedPrescriptionIds([]);
      onOpenChange(false);
    },
  });

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-teal-600" />
            Send Prescriptions to Pharmacy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient */}
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="font-semibold text-slate-900">{patient.first_name} {patient.last_name}</p>
            <p className="text-sm text-slate-500">{patient.phn || patient.mrn || 'No ID'}</p>
          </div>

          {/* Pharmacy selector */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-4 h-4" /> Target Pharmacy
            </Label>
            <Select
              value={selectedPharmacyId}
              onValueChange={setSelectedPharmacyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose pharmacy..." />
              </SelectTrigger>
              <SelectContent>
                {orgs.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} {patient.preferred_pharmacy_org_id === org.id ? '⭐ Preferred' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prescription selection */}
          <div>
            <Label className="mb-1.5 block">Select Prescriptions to Send</Label>
            {eligible.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2 text-amber-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                No pending prescriptions available (already sent or dispensed).
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {eligible.map(rx => (
                  <div
                    key={rx.id}
                    onClick={() => togglePrescription(rx.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPrescriptionIds.includes(rx.id)
                        ? 'bg-teal-50 border-teal-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedPrescriptionIds.includes(rx.id) ? 'bg-teal-600 border-teal-600' : 'border-slate-300'
                    }`}>
                      {selectedPrescriptionIds.includes(rx.id) && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{rx.drug_name} {rx.strength}</p>
                      <p className="text-xs text-slate-500">
                        Qty: {rx.quantity} · {rx.dosage_form} · {format(new Date(rx.prescribed_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{rx.directions}</p>
                    </div>
                    <Badge className={rx.status === 'Verified' ? 'bg-blue-100 text-blue-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                      {rx.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              disabled={!selectedPharmacyId || selectedPrescriptionIds.length === 0 || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMutation.isPending ? 'Sending...' : `Send ${selectedPrescriptionIds.length > 0 ? `(${selectedPrescriptionIds.length})` : ''} to Pharmacy`}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}