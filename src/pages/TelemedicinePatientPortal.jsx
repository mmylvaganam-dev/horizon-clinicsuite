import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, LogOut, User, Video, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import BookingWizard from '@/components/telemedicine/BookingWizard';
import RequestRenewalButton from '@/components/pharmacy/RequestRenewalButton';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 animate-pulse',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
};

function AppointmentRow({ appt, onRefresh }) {
  const [joining, setJoining] = useState(false);
  const qc = useQueryClient();

  const scheduledTime = appt.scheduled_time ? parseISO(appt.scheduled_time) : null;
  const isActive = ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status);
  const isInProgress = appt.status === 'IN_PROGRESS';
  const isVideoCall = appt.visit_type === 'VIDEO' || !appt.visit_type;

  // Patient can enter waiting room once confirmed; call opens when provider joins
  const canJoin = isVideoCall && isInProgress;
  const isWaiting = isVideoCall && appt.status === 'CONFIRMED';

  const cancelMutation = useMutation({
    mutationFn: () => base44.entities.TeleAppointment.update(appt.id, { status: 'CANCELLED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleAppointments'] });
      onRefresh?.();
    },
  });

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await base44.functions.invoke('joinTeleRoom', {
        appointment_id: appt.id,
        role: 'patient',
      });
      const url = res?.data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert(res?.data?.error || 'Could not connect to call. Please try again.');
      }
    } catch (e) {
      alert('Failed to join: ' + e.message);
    } finally {
      setJoining(false);
    }
  };

  const getTimeLabel = () => {
    if (!scheduledTime) return '';
    if (isToday(scheduledTime)) return `Today at ${format(scheduledTime, 'h:mm a')}`;
    if (isTomorrow(scheduledTime)) return `Tomorrow at ${format(scheduledTime, 'h:mm a')}`;
    return format(scheduledTime, 'EEE, MMM d · h:mm a');
  };

  return (
    <Card className={`transition-all ${isInProgress ? 'border-yellow-400 shadow-md' : 'hover:shadow-sm'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isInProgress ? 'bg-yellow-100' : 'bg-teal-100'}`}>
              <Video className={`w-5 h-5 ${isInProgress ? 'text-yellow-600' : 'text-teal-600'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm">Dr. {appt.provider_name || '—'}</p>
                <Badge className={`${STATUS_COLORS[appt.status]} border-0 text-xs`}>
                  {appt.status === 'IN_PROGRESS' ? '🟡 Live' : appt.status}
                </Badge>
              </div>
              {scheduledTime && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {getTimeLabel()}
                </p>
              )}
              {appt.patient_notes && (
                <p className="text-xs text-slate-400 mt-1 italic truncate">"{appt.patient_notes}"</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
            {canJoin && (
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={handleJoin} disabled={joining}>
                <Video className="w-3.5 h-3.5" />
                {joining ? 'Connecting...' : 'Join Call'}
              </Button>
            )}
            {isWaiting && (
              <div className="text-xs text-teal-600 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> Waiting for provider
              </div>
            )}
            {isActive && !isInProgress && !isWaiting && appt.status === 'BOOKED' && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TelemedicinePatientPortal() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [showBooking, setShowBooking] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem('tele_patient_session');
    if (!stored) {
      window.location.href = createPageUrl('TeleLogin');
      return;
    }
    setSession(JSON.parse(stored));
  }, []);

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['teleAppointments', session?.id],
    queryFn: () => base44.entities.TeleAppointment.filter({ patient_id: session.id }, '-scheduled_time', 50),
    enabled: !!session?.id,
    refetchInterval: 15000, // poll every 15s so IN_PROGRESS status appears quickly
  });

  const { data: myPrescriptions = [] } = useQuery({
    queryKey: ['telePatientPrescriptions', session?.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: session.patient_id || session.id }),
    enabled: !!session,
  });

  const upcoming = appointments.filter(a => ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status));
  const past = appointments.filter(a => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status));
  const liveCall = upcoming.find(a => a.status === 'IN_PROGRESS');

  const handleLogout = () => {
    localStorage.removeItem('tele_patient_session');
    window.location.href = createPageUrl('TeleLogin');
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Virtual Clinic</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{session.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Live call banner */}
        {liveCall && (
          <div className="bg-yellow-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">Your call is live!</p>
                <p className="text-yellow-100 text-sm">Dr. {liveCall.provider_name} is waiting for you</p>
              </div>
            </div>
            <Button
              className="bg-white text-yellow-700 hover:bg-yellow-50 font-bold"
              onClick={async () => {
                const res = await base44.functions.invoke('joinTeleRoom', { appointment_id: liveCall.id, role: 'patient' });
                const url = res?.data?.url;
                if (url) window.open(url, '_blank');
              }}
            >
              Join Now
            </Button>
          </div>
        )}

        {/* Welcome card */}
        {!liveCall && (
          <div className="bg-teal-600 rounded-2xl p-5 text-white">
            <p className="text-teal-100 text-sm">Welcome back,</p>
            <h2 className="text-xl font-bold">{session.name}</h2>
            <p className="text-teal-100 text-sm mt-1">{session.email}</p>
            <Button
              className="mt-4 bg-white text-teal-700 hover:bg-teal-50"
              onClick={() => setShowBooking(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Book a Consultation
            </Button>
          </div>
        )}

        {showBooking ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                Book a Consultation
                <Button variant="ghost" size="sm" onClick={() => setShowBooking(false)}>✕ Cancel</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BookingWizard
                patient={session}
                onBookingComplete={() => { setShowBooking(false); refetch(); }}
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="upcoming" className="flex-1">
                Upcoming {upcoming.length > 0 && <Badge className="ml-2 bg-teal-600 text-white border-0">{upcoming.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex-1">
                Prescriptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3 mt-4">
              {upcoming.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="font-medium">No upcoming appointments</p>
                  <p className="text-sm mt-1">Book your first virtual consultation</p>
                  <Button className="mt-4" onClick={() => setShowBooking(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Book Now
                  </Button>
                </div>
              ) : (
                upcoming.map(a => <AppointmentRow key={a.id} appt={a} onRefresh={refetch} />)
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3 mt-4">
              {past.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No past appointments.</p>
              ) : (
                past.map(a => <AppointmentRow key={a.id} appt={a} />)
              )}
            </TabsContent>

            <TabsContent value="prescriptions" className="space-y-3 mt-4">
              {myPrescriptions.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No prescriptions on file.</p>
              ) : (
                myPrescriptions.map(rx => (
                  <Card key={rx.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900 text-sm">{rx.drug_name} {rx.strength}</p>
                          <p className="text-xs text-slate-500">{rx.directions}</p>
                          <p className="text-xs text-slate-500">Qty: {rx.quantity} · Status: {rx.status}</p>
                        </div>
                        <RequestRenewalButton
                          prescription={rx}
                          patientName={session.name}
                          via="portal"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}