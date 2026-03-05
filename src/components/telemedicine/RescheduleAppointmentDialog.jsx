import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, Clock } from 'lucide-react';

export default function RescheduleAppointmentDialog({ appointment, open, onOpenChange, onDone }) {
  const qc = useQueryClient();
  const [newDatetime, setNewDatetime] = useState(
    appointment?.scheduled_time
      ? new Date(appointment.scheduled_time).toISOString().slice(0, 16)
      : ''
  );

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      base44.entities.TeleAppointment.update(appointment.id, {
        scheduled_time: new Date(newDatetime).toISOString(),
        status: 'BOOKED',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleAppointments'] });
      qc.invalidateQueries({ queryKey: ['teleAppointmentsList'] });
      onOpenChange(false);
      onDone?.();
    },
  });

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            Reschedule Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-slate-500 mb-1">Patient: <span className="font-medium text-slate-800">{appointment.patient_name}</span></p>
            <p className="text-sm text-slate-500">Provider: <span className="font-medium text-slate-800">{appointment.provider_name}</span></p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              New Date & Time
            </Label>
            <Input
              type="datetime-local"
              value={newDatetime}
              onChange={(e) => setNewDatetime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            disabled={!newDatetime || rescheduleMutation.isPending}
            onClick={() => rescheduleMutation.mutate()}
          >
            {rescheduleMutation.isPending ? 'Saving...' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}