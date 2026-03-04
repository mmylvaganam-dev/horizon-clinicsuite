import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Heart, 
  Pill, 
  Clock, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

export default function TelehealthPatientPreview({ patientId, appointmentId, teleHealthLink }) {
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.list().then(patients => 
      patients.find(p => p.id === patientId)
    ),
    enabled: !!patientId,
  });

  const { data: medicalRecords = [] } = useQuery({
    queryKey: ['medicalRecords', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      return base44.entities.MedicalRecord.filter({ patient_id: patientId }, '-created_date');
    },
    enabled: !!patientId,
  });

  if (patientLoading) return <div className="text-center py-4 text-slate-500">Loading patient data...</div>;

  const latestRecord = medicalRecords[0];
  const allergies = patient?.allergies || 'None documented';
  const chronicConditions = patient?.chronic_conditions || 'None';

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {/* Patient Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-teal-50 border-teal-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{patient?.first_name} {patient?.last_name}</CardTitle>
            {patient?.phn && <Badge variant="outline">{patient.phn}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {patient?.date_of_birth && (
            <p><span className="text-slate-600">Age:</span> {Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))} years</p>
          )}
          {patient?.gender && <p><span className="text-slate-600">Gender:</span> <span className="capitalize">{patient.gender}</span></p>}
        </CardContent>
      </Card>

      {/* Allergies Alert */}
      {allergies !== 'None documented' && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm">Allergies</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-amber-800">
            {allergies}
          </CardContent>
        </Card>
      )}

      {/* Latest Medical Record */}
      {latestRecord && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <CardTitle className="text-sm">Latest Record</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-600">Date:</span> {format(new Date(latestRecord.record_date), 'MMM d, yyyy')}</p>
            <p><span className="text-slate-600">Type:</span> <span className="capitalize">{latestRecord.record_type?.replace('_', ' ')}</span></p>
            {latestRecord.diagnosis && <p><span className="text-slate-600">Diagnosis:</span> {latestRecord.diagnosis}</p>}
          </CardContent>
        </Card>
      )}

      {/* Chronic Conditions */}
      {chronicConditions !== 'None' && (
        <Card className="bg-rose-50 border-rose-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-600" />
              <CardTitle className="text-sm">Chronic Conditions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-rose-800">
            {chronicConditions}
          </CardContent>
        </Card>
      )}

      {/* Telehealth Link */}
      {teleHealthLink && (
        <Button 
          asChild
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          <a href={teleHealthLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Join Telehealth Session
          </a>
        </Button>
      )}
    </div>
  );
}