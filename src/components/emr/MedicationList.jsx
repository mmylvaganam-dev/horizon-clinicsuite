import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Pill } from 'lucide-react';
import { format } from 'date-fns';

export default function MedicationList({ patientId }) {
  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patientPrescriptions', patientId],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patientId }, '-prescribed_date'),
  });

  const activeMeds = prescriptions.filter(p => p.status === 'Verified' || p.status === 'Dispensed');

  if (activeMeds.length === 0) {
    return <p className="text-sm text-slate-500 italic">No current medications</p>;
  }

  return (
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
  );
}