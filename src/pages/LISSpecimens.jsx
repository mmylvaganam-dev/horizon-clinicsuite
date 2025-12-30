import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestTube } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  collected: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  rejected: 'bg-rose-100 text-rose-700',
  stored: 'bg-slate-100 text-slate-700',
  disposed: 'bg-slate-100 text-slate-700'
};

export default function LISSpecimens() {
  const { data: specimens = [] } = useQuery({
    queryKey: ['specimens'],
    queryFn: () => base44.entities.Specimen.list(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Specimens</h1>
        <p className="text-slate-500 mt-1">Specimen tracking and chain of custody</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            All Specimens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {specimens.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No specimens yet</p>
          ) : (
            <div className="space-y-2">
              {specimens.map(specimen => {
                const patient = patients.find(p => p.id === specimen.patient_ref);
                return (
                  <div key={specimen.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-slate-900">
                            {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                          </p>
                          <Badge variant="outline">{specimen.specimen_id}</Badge>
                          {specimen.priority === 'stat' && (
                            <Badge className="bg-rose-100 text-rose-700">STAT</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Accession #</p>
                            <p className="font-medium">{specimen.accession_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Type</p>
                            <p className="font-medium capitalize">{specimen.specimen_type}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Collected</p>
                            <p className="font-medium">
                              {format(new Date(specimen.collection_date), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          {specimen.received_date && (
                            <div>
                              <p className="text-slate-500">Received</p>
                              <p className="font-medium">
                                {format(new Date(specimen.received_date), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          )}
                        </div>
                        {specimen.rejection_reason && (
                          <div className="mt-2 p-2 bg-rose-50 rounded border border-rose-200">
                            <p className="text-sm text-rose-800">
                              <span className="font-semibold">Rejected:</span> {specimen.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                      <Badge className={statusColors[specimen.status]}>
                        {specimen.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}