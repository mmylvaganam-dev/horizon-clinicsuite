import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, Mic, MessageSquare, User, Paperclip, X, RefreshCw, ExternalLink } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import RescheduleAppointmentDialog from './RescheduleAppointmentDialog';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
};

const VISIT_ICONS = {
  VIDEO: Video,
  AUDIO: Mic,
  CHAT: MessageSquare,
};

export default function AppointmentCard({ appt, role = 'patient', onRefresh }) {
  const VisitIcon = VISIT_ICONS[appt.visit_type] || Video;
  const scheduledTime = appt.scheduled_time ? new Date(appt.scheduled_time) : null;
  const isActive = ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status);
  const isInProgress = appt.status === 'IN_PROGRESS';
  const isUpcoming = ['BOOKED', 'CONFIRMED'].includes(appt.status);
  const isVideoCall = appt.visit_type === 'VIDEO' || !appt.visit_type;
  const [joining, setJoining] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const qc = useQueryClient();

  const isProvider = role === 'provider' || role === 'staff';

  // Patient can cancel if >24h away
  const canCancel = !isProvider && isActive && scheduledTime &&
    differenceInHours(scheduledTime, new Date()) >= 24;

  const cancelMutation = useMutation({
    mutationFn: () => base44.entities.TeleAppointment.update(appt.id, { status: 'CANCELLED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleAppointments'] });
      qc.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] });
      onRefresh?.();
    },
  });

  // Universal join handler — uses the new joinTeleRoom backend function
  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await base44.functions.invoke('joinTeleRoom', {
        appointment_id: appt.id,
        role: isProvider ? 'provider' : 'patient',
      });
      const url = res?.data?.url;
      if (url) {
        window.open(url, '_blank');
        // Refresh so status change (IN_PROGRESS) is reflected
        qc.invalidateQueries({ queryKey: ['teleAppointments'] });
        qc.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] });
        onRefresh?.();
      } else {
        alert(res?.data?.error || 'Could not get video room URL. Please try again.');
      }
    } catch (e) {
      alert('Failed to join: ' + e.message);
    } finally {
      setJoining(false);
    }
  };

  // Can join: provider can always join active appts; patient can join when IN_PROGRESS
  const canJoin = isVideoCall && (
    isProvider ? isActive : isInProgress
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <VisitIcon className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-slate-700">{appt.visit_type || 'VIDEO'}</span>
          </div>
          <Badge className={`${STATUS_COLORS[appt.status]} border-0 text-xs`}>{appt.status}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User className="w-4 h-4 text-slate-400" />
          {!isProvider ? (
            <span><span className="text-slate-400">Provider:</span> {appt.provider_name || '—'}</span>
          ) : (
            <span><span className="text-slate-400">Patient:</span> {appt.patient_name || '—'}</span>
          )}
        </div>

        {scheduledTime && (
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400" />{format(scheduledTime, 'PPP')}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-400" />{format(scheduledTime, 'p')}</span>
          </div>
        )}

        {appt.patient_notes && (
          <p className="text-xs text-slate-500 italic bg-slate-50 rounded px-2 py-1">"{appt.patient_notes}"</p>
        )}

        {appt.pre_consult_files?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Paperclip className="w-3 h-3" />
            {appt.pre_consult_files.length} file(s) attached
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t">
          <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{appt.billing_mode || 'FREE'}</Badge>
          <div className="flex items-center gap-2">
            {/* Provider reschedule */}
            {isProvider && isUpcoming && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => setShowReschedule(true)}
              >
                <RefreshCw className="w-3 h-3" />
                Reschedule
              </Button>
            )}
            {/* Patient cancel */}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                <X className="w-3 h-3" />
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
            {/* JOIN BUTTON — always visible for video when eligible */}
            {canJoin && (
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 gap-1.5"
                onClick={handleJoin}
                disabled={joining}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {joining ? 'Connecting...' : isProvider ? 'Start / Join Call' : 'Join Call'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <RescheduleAppointmentDialog
        appointment={appt}
        open={showReschedule}
        onOpenChange={setShowReschedule}
        onDone={onRefresh}
      />
    </Card>
  );
}