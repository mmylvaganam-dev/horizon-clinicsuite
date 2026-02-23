import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, CheckCircle, XCircle, UserCheck } from 'lucide-react';

export default function EnableTeleAccessDialog({ patient, open, onOpenChange }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(patient?.email || '');

  const { data: telePatients = [], isLoading } = useQuery({
    queryKey: ['telePatientByPatient', patient?.id],
    queryFn: () => base44.entities.TelePatient.filter({ patient_id: patient?.id }),
    enabled: !!patient?.id && open,
  });

  const telePatient = telePatients[0];

  const enableMutation = useMutation({
    mutationFn: async () => {
      const emailToUse = email || patient?.email;
      if (telePatient) {
        return base44.entities.TelePatient.update(telePatient.id, {
          tele_access_enabled: true,
          email: emailToUse,
          name: `${patient.first_name} ${patient.last_name}`,
          phone: patient.phone || patient.mobile || '',
          date_of_birth: patient.date_of_birth || '',
          patient_id: patient.id,
          organization_id: patient.organization_id,
        });
      } else {
        return base44.entities.TelePatient.create({
          patient_id: patient.id,
          organization_id: patient.organization_id,
          name: `${patient.first_name} ${patient.last_name}`,
          email: emailToUse,
          phone: patient.phone || patient.mobile || '',
          date_of_birth: patient.date_of_birth || '',
          tele_access_enabled: true,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telePatientByPatient', patient?.id] }),
  });

  const disableMutation = useMutation({
    mutationFn: () => base44.entities.TelePatient.update(telePatient.id, { tele_access_enabled: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telePatientByPatient', patient?.id] }),
  });

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-teal-600" />
            Telemedicine Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="font-medium text-slate-900">{patient.first_name} {patient.last_name}</p>
            <p className="text-sm text-slate-500">{patient.phn || patient.mrn || 'No ID'}</p>
          </div>

          {isLoading ? (
            <p className="text-slate-400 text-sm">Checking access...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Current Status</span>
                {telePatient?.tele_access_enabled ? (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Access Enabled
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 border-0">
                    <XCircle className="w-3.5 h-3.5 mr-1" /> No Access
                  </Badge>
                )}
              </div>

              {!telePatient?.tele_access_enabled && (
                <div>
                  <Label>Patient Email for Login *</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    placeholder="patient@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">Patient will use this email to log in via OTP.</p>
                </div>
              )}

              {telePatient?.tele_access_enabled && (
                <div className="bg-teal-50 rounded-lg px-4 py-3 text-sm text-teal-700 space-y-1">
                  <p><strong>Login Email:</strong> {telePatient.email}</p>
                  <p className="text-xs text-teal-600">Patient can log in at the Telemedicine Patient Portal using this email + OTP.</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                {!telePatient?.tele_access_enabled ? (
                  <Button
                    className="flex-1"
                    disabled={!email || enableMutation.isPending}
                    onClick={() => enableMutation.mutate()}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {enableMutation.isPending ? 'Enabling...' : 'Enable Telemedicine Access'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={disableMutation.isPending}
                    onClick={() => disableMutation.mutate()}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {disableMutation.isPending ? 'Disabling...' : 'Revoke Access'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}