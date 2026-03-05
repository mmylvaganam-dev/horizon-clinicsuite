import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Can be used from EMR/Patient record (staff) or Patient Portal.
 * Props:
 *   prescription: Prescription record (must have status Verified or Dispensed)
 *   patientName:  string
 *   via:          'staff' | 'portal'   (default 'staff')
 *   onDone:       optional callback after submission
 */
export default function RequestRenewalButton({ prescription, patientName, via = 'staff', onDone }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(prescription?.quantity || '');
  const [notes, setNotes] = useState('');
  const qc = useQueryClient();

  const eligible = prescription && ['Verified', 'Dispensed'].includes(prescription.status);

  const submit = useMutation({
    mutationFn: () => base44.entities.PrescriptionRenewalRequest.create({
      organization_id: prescription.organization_id,
      original_prescription_id: prescription.id,
      patient_id: prescription.patient_id,
      patient_name: patientName,
      drug_name: prescription.drug_name,
      strength: prescription.strength || '',
      dosage_form: prescription.dosage_form || '',
      directions: prescription.directions,
      quantity_requested: Number(quantity),
      original_quantity: prescription.quantity,
      requested_by: patientName,
      requested_via: via,
      patient_notes: notes,
      status: 'pending',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renewalRequests'] });
      toast.success('Renewal request submitted!');
      setOpen(false);
      onDone?.();
    },
  });

  if (!eligible) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-teal-300 text-teal-700 hover:bg-teal-50"
        onClick={() => setOpen(true)}
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Request Renewal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-teal-600" />
              Request Prescription Renewal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 space-y-1">
              <p><span className="font-medium">Drug:</span> {prescription.drug_name} {prescription.strength}</p>
              <p><span className="font-medium">Directions:</span> {prescription.directions}</p>
              <p><span className="font-medium">Original Qty:</span> {prescription.quantity}</p>
            </div>

            <div>
              <Label>Quantity Requested</Label>
              <Input
                type="number"
                className="mt-1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min={1}
              />
            </div>

            <div>
              <Label>Notes for Pharmacist (optional)</Label>
              <Textarea
                className="mt-1"
                placeholder="Any symptoms, questions, or additional context…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1"
                disabled={!quantity || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? 'Submitting…' : 'Submit Renewal Request'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}