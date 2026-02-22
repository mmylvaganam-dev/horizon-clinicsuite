import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, Mic, MessageSquare, User, Paperclip, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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

export default function AppointmentCard({ appt, role = 'patient' }) {
  const VisitIcon = VISIT_ICONS[appt.visit_type] || Video;
  const scheduledTime = appt.scheduled_time ? new Date(appt.scheduled_time) : null;
  const isInProgress = appt.status === 'IN_PROGRESS';
  const [joining, setJoining] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ['virtualRoom', appt.id],
    queryFn: () => base44.entities.VirtualRoom.filter({ appointment_id: appt.id }),
    enabled: isInProgress,
  });

  const room = rooms[0];

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      setJoining(true);
      const res = await base44.functions.invoke('createWherebyRoom', { appointment_id: appt.id });
      return res.data.room;
    },
    onSuccess: (newRoom) => {
      window.open(newRoom.join_url, '_blank');
      setJoining(false);
    },
    onError: () => setJoining(false),
  });

  const handleJoin = () => {
    if (room?.join_url) {
      window.open(room.join_url, '_blank');
    } else {
      createRoomMutation.mutate();
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <VisitIcon className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-slate-700">{appt.visit_type}</span>
          </div>
          <Badge className={`${STATUS_COLORS[appt.status]} border-0 text-xs`}>{appt.status}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User className="w-4 h-4 text-slate-400" />
          {role === 'patient' ? (
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
          <p className="text-xs text-slate-500 italic">"{appt.patient_notes}"</p>
        )}

        {appt.pre_consult_files?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Paperclip className="w-3 h-3" />
            {appt.pre_consult_files.length} file(s) attached
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t">
          <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{appt.billing_mode || 'FREE'}</Badge>
          {isInProgress && (
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 gap-1.5"
              onClick={handleJoin}
              disabled={joining || createRoomMutation.isPending}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {joining || createRoomMutation.isPending ? 'Connecting...' : 'Join Visit'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}