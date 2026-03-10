import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  User, Mail, Phone, MapPin, Globe, Calendar, Video, FileText, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
};

export default function TelePatientProfileDialog({ patient, open, onClose }) {
  const qc = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['telePatientAppts', patient?.id],
    queryFn: () => base44.entities.TeleAppointment.filter({ patient_id: patient.id }),
    enabled: !!patient?.id,
  });

  const { data: opinions = [] } = useQuery({
    queryKey: ['telePatientOpinions', patient?.id],
    queryFn: () => base44.entities.SecondOpinionRequest.filter({ patient_id: patient.id }),
    enabled: !!patient?.id,
  });

  const enableAccessMutation = useMutation({
    mutationFn: () => base44.entities.TelePatient.update(patient.id, { tele_access_enabled: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telePatients'] });
      toast.success('Tele access enabled for patient');
    },
  });

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Patient Profile
          </DialogTitle>
        </DialogHeader>

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {patient.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{patient.name}</h2>
              <div className="flex items-center gap-3 text-teal-100 text-sm mt-1 flex-wrap">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{patient.email}</span>
                {patient.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>}
              </div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-2">
              <Badge className={patient.tele_access_enabled ? 'bg-green-500 text-white border-0' : 'bg-red-400 text-white border-0'}>
                {patient.tele_access_enabled ? 'Access Enabled' : 'No Portal Access'}
              </Badge>
              {!patient.tele_access_enabled && (
                <Button size="sm" className="bg-white text-teal-700 hover:bg-teal-50 text-xs"
                  onClick={() => enableAccessMutation.mutate()}
                  disabled={enableAccessMutation.isPending}>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Enable Access
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {patient.date_of_birth && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>DOB: {patient.date_of_birth}</span>
            </div>
          )}
          {patient.gender && (
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span className="capitalize">{patient.gender}</span>
            </div>
          )}
          {patient.country_of_residence && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{patient.country_of_residence}</span>
            </div>
          )}
          {patient.nationality && (
            <div className="flex items-center gap-2 text-slate-600">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>{patient.nationality}</span>
            </div>
          )}
          {patient.region && (
            <div className="flex items-center gap-2 text-slate-600">
              <Globe className="w-4 h-4 text-slate-400" />
              <Badge className="text-xs">{patient.region}</Badge>
            </div>
          )}
          {patient.passport_number && (
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Passport: {patient.passport_number}</span>
            </div>
          )}
        </div>

        {patient.medical_summary && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
            <p className="font-semibold mb-1">Medical Summary</p>
            <p>{patient.medical_summary}</p>
          </div>
        )}

        {/* Tabs for appointments & opinions */}
        <Tabs defaultValue="appointments">
          <TabsList>
            <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
            <TabsTrigger value="opinions">Second Opinions ({opinions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-2 mt-3">
            {appointments.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">No appointments yet.</p>
            ) : (
              appointments
                .sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time))
                .map(a => (
                  <div key={a.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Dr. {a.provider_name || '—'} · {a.visit_type}
                        </p>
                        {a.scheduled_time && (
                          <p className="text-xs text-slate-500">
                            {format(new Date(a.scheduled_time), 'dd MMM yyyy, HH:mm')}
                          </p>
                        )}
                        {a.diagnosis && <p className="text-xs text-teal-700 mt-0.5">Dx: {a.diagnosis}</p>}
                      </div>
                    </div>
                    <Badge className={`${STATUS_COLORS[a.status] || 'bg-slate-100 text-slate-700'} border-0 text-xs`}>
                      {a.status}
                    </Badge>
                  </div>
                ))
            )}
          </TabsContent>

          <TabsContent value="opinions" className="space-y-2 mt-3">
            {opinions.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">No second opinion requests.</p>
            ) : (
              opinions.map(op => (
                <div key={op.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900">{op.specialty_required || 'General'}</p>
                    <Badge className="text-xs">{op.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-600">Diagnosis: {op.original_diagnosis}</p>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}