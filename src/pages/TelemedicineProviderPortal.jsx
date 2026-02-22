import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import AppointmentCard from '@/components/telemedicine/AppointmentCard';
import { format } from 'date-fns';

const NEXT_STATUS = {
  BOOKED: 'CONFIRMED',
  CONFIRMED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

export default function TelemedicineProviderPortal() {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [tab, setTab] = useState('upcoming');
  const queryClient = useQueryClient();

  const { data: providers = [] } = useQuery({
    queryKey: ['teleProvidersAll'],
    queryFn: () => base44.entities.TeleProvider.filter({ is_active: true }),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['teleAppointmentsProvider', selectedProvider],
    queryFn: () => base44.entities.TeleAppointment.filter({ provider_id: selectedProvider }),
    enabled: !!selectedProvider,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TeleAppointment.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] }),
  });

  const upcoming = appointments.filter(a => ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status));
  const past = appointments.filter(a => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Provider Portal</h1>
        <p className="text-slate-500 text-sm">Manage your virtual consultations</p>
      </div>

      <div>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select your provider profile..." />
          </SelectTrigger>
          <SelectContent>
            {providers.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProvider ? (
        <div className="text-center py-16 text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p>Select a provider profile to view appointments.</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p>No upcoming appointments.</p>
              </div>
            ) : (
              upcoming.map(appt => (
                <div key={appt.id} className="space-y-2">
                  <AppointmentCard appt={appt} role="provider" />
                  <div className="flex gap-2 px-1">
                    {NEXT_STATUS[appt.status] && (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => updateStatus.mutate({ id: appt.id, status: NEXT_STATUS[appt.status] })}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark as {NEXT_STATUS[appt.status]}
                      </Button>
                    )}
                    {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => updateStatus.mutate({ id: appt.id, status: 'CANCELLED' })}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: appt.id, status: 'NO_SHOW' })}
                          disabled={updateStatus.isPending}
                        >
                          <Clock className="w-4 h-4 mr-1" /> No Show
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-4">
            {past.length === 0 ? (
              <p className="text-center py-12 text-slate-400">No past appointments.</p>
            ) : (
              past.map(appt => <AppointmentCard key={appt.id} appt={appt} role="provider" />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}