import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, Clock, User, ExternalLink, RefreshCw } from 'lucide-react';
import { format, isToday, parseISO, isPast } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-500',
};

const NEXT_STATUS = { BOOKED: 'CONFIRMED', CONFIRMED: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED' };

export default function TodaySchedule({ appointments }) {
  const queryClient = useQueryClient();

  const todayAppts = appointments
    .filter(a => a.scheduled_time && isToday(parseISO(a.scheduled_time)))
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TeleAppointment.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] }),
  });

  const startVideoCall = async (appt) => {
    // joinTeleRoom handles room creation + IN_PROGRESS transition + returns correct URL
    const res = await base44.functions.invoke('joinTeleRoom', {
      appointment_id: appt.id,
      role: 'provider',
    });
    const url = res?.data?.url;
    if (url) {
      window.open(url, '_blank');
      queryClient.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] });
    }
  };

  if (todayAppts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 py-4 text-center">No appointments scheduled for today.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center justify-between">
          <span>Today's Schedule</span>
          <span className="text-xs font-normal text-slate-400">{format(new Date(), 'EEEE, MMM d')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {todayAppts.map(appt => {
          const time = parseISO(appt.scheduled_time);
          const isOverdue = isPast(time) && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status);
          const canStart = ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status);

          return (
            <div
              key={appt.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${isOverdue ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-white'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`text-xs font-mono font-semibold ${isOverdue ? 'text-orange-600' : 'text-slate-600'} whitespace-nowrap`}>
                  {format(time, 'HH:mm')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-800 truncate">{appt.patient_name || '—'}</span>
                    {isOverdue && <span className="text-xs text-orange-500 font-medium">Overdue</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`${STATUS_COLORS[appt.status]} border-0 text-xs py-0`}>{appt.status}</Badge>
                    <span className="text-xs text-slate-400">{appt.appointment_type || 'CONSULTATION'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {NEXT_STATUS[appt.status] && appt.status !== 'IN_PROGRESS' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2"
                    onClick={() => updateStatus.mutate({ id: appt.id, status: NEXT_STATUS[appt.status] })}
                    disabled={updateStatus.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {NEXT_STATUS[appt.status]}
                  </Button>
                )}
                {canStart && appt.visit_type === 'VIDEO' && (
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-xs h-7 px-2 gap-1"
                    onClick={() => startVideoCall(appt)}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Start
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}