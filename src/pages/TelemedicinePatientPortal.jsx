import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, LogOut, User, Video } from 'lucide-react';
import { createPageUrl } from '@/utils';
import BookingWizard from '@/components/telemedicine/BookingWizard';
import AppointmentCard from '@/components/telemedicine/AppointmentCard';
import RequestRenewalButton from '@/components/pharmacy/RequestRenewalButton';

export default function TelemedicinePatientPortal() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [showBooking, setShowBooking] = useState(false);
  const qc = useQueryClient();

  // Load session from localStorage
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
    queryFn: () => base44.entities.TeleAppointment.filter({ patient_id: session.id }),
    enabled: !!session?.id,
  });

  const { data: myPrescriptions = [] } = useQuery({
    queryKey: ['telePatientPrescriptions', session?.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: session.patient_id || session.id }),
    enabled: !!session,
  });

  const renewablePrescriptions = myPrescriptions.filter(p => ['Verified', 'Dispensed'].includes(p.status));

  const upcoming = appointments.filter(a => ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status));
  const past = appointments.filter(a => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status));

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

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome card */}
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

        {showBooking ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                Book a Consultation
                <Button variant="ghost" size="sm" onClick={() => setShowBooking(false)}>Cancel</Button>
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
              {renewablePrescriptions.length > 0 && (
                <Badge className="ml-1 bg-teal-600 text-white border-0 text-xs">{renewablePrescriptions.length}</Badge>
              )}
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
                upcoming.map(a => <AppointmentCard key={a.id} appt={a} role="patient" />)
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3 mt-4">
              {past.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No past appointments.</p>
              ) : (
                past.map(a => <AppointmentCard key={a.id} appt={a} role="patient" />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}