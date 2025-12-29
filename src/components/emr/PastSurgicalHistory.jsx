import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Scissors } from 'lucide-react';
import { format } from 'date-fns';

export default function PastSurgicalHistory({ patientId }) {
  const { data: records = [] } = useQuery({
    queryKey: ['patientSurgicalHistory', patientId],
    queryFn: async () => {
      const allRecords = await base44.entities.MedicalRecord.filter({ 
        patient_id: patientId,
        record_type: 'procedure'
      }, '-record_date');
      return allRecords;
    },
  });

  if (records.length === 0) {
    return <p className="text-sm text-slate-500 italic">No surgical history documented</p>;
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <div key={record.id} className="p-3 rounded-lg border bg-slate-50">
          <div className="flex items-start gap-3">
            <Scissors className="w-5 h-5 text-slate-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{record.diagnosis || 'Procedure'}</p>
              <p className="text-sm text-slate-600 mt-1">{record.treatment_plan}</p>
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(record.record_date), 'MMM d, yyyy')}
                {record.provider && ` • ${record.provider}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}