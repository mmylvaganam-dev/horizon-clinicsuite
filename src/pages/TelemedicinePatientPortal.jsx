import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Calendar } from 'lucide-react';
import BookingWizard from '@/components/telemedicine/BookingWizard';
import AppointmentCard from '@/components/telemedicine/AppointmentCard';

export default function TelemedicinePatientPortal() {
  const [tab, setTab] = useState('appointments');
  const [showBooking, setShowBooking] = useState(false);

  // Simple patient form (no login required — demo uses entered info)
  const [patientInfo, setPatientInfo] = useState({
    id: 'demo-patient',
    name: '',
    email: '',
    phone: '',
  });
  const [patientReady, setPatientReady] = useState(false);

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['teleAppointments', patientInfo.id],
    queryFn: () => base44.entities.TeleAppointment.filter({ patient_id: patientInfo.id }),
    enabled: patientReady,
  });

  const upcoming = appointments.filter(a => ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status));
  const past = appointments.filter(a => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status));

  if (!patientReady) {
    return (
      <div className="max-w-md mx-auto mt-12 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Portal</h1>
          <p className="text-slate-500 mt-1 text-sm">Enter your details to continue</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input className="mt-1" placeholder="Your name" value={patientInfo.name} onChange={e => setPatientInfo(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" placeholder="your@email.com" value={patientInfo.email} onChange={e => setPatientInfo(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" placeholder="+1 555 0000" value={patientInfo.phone} onChange={e => setPatientInfo(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <Button
              className="w-full"
              disabled={!patientInfo.name || !patientInfo.email}
              onClick={() => {
                setPatientInfo(p => ({ ...p, id: `patient-${p.email}` }));
                setPatientReady(true);
              }}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Portal</h1>
          <p className="text-slate-500 text-sm">Welcome, {patientInfo.name}</p>
        </div>
        {!showBooking && (
          <Button onClick={() => setShowBooking(true)}>
            <Plus className="w-4 h-4 mr-2" /> Book Consultation
          </Button>
        )}
      </div>

      {showBooking ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Book a Consultation
              <Button variant="ghost" size="sm" onClick={() => setShowBooking(false)}>Cancel</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BookingWizard
              patient={patientInfo}
              onBookingComplete={() => { setShowBooking(false); refetch(); }}
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="appointments">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="appointments" className="space-y-3 mt-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p>No upcoming appointments.</p>
                <Button className="mt-4" onClick={() => setShowBooking(true)}>Book Now</Button>
              </div>
            ) : (
              upcoming.map(a => <AppointmentCard key={a.id} appt={a} role="patient" />)
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-3 mt-4">
            {past.length === 0 ? (
              <p className="text-center py-12 text-slate-400">No past appointments.</p>
            ) : (
              past.map(a => <AppointmentCard key={a.id} appt={a} role="patient" />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}