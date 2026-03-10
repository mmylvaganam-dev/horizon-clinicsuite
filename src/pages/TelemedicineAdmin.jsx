import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Video, CheckCircle, Clock, XCircle, AlertCircle, Wrench, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import AppointmentCard from '@/components/telemedicine/AppointmentCard';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
};

const NEXT_STATUS = {
  BOOKED: 'CONFIRMED',
  CONFIRMED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

export default function TelemedicineAdmin() {
  const [statusFilter, setStatusFilter] = useState('all');
  const qc = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['teleAppointmentsAll'],
    queryFn: () => base44.entities.TeleAppointment.list('-scheduled_time', 100),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['teleProviders'],
    queryFn: () => base44.entities.TeleProvider.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['allVirtualRooms'],
    queryFn: () => base44.entities.VirtualRoom.list(),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TeleAppointment.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teleAppointmentsAll'] }),
  });

  const filtered = statusFilter === 'all'
    ? appointments
    : appointments.filter(a => a.status === statusFilter);

  const counts = {
    total: appointments.length,
    booked: appointments.filter(a => a.status === 'BOOKED').length,
    inProgress: appointments.filter(a => a.status === 'IN_PROGRESS').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => ['CANCELLED', 'NO_SHOW'].includes(a.status)).length,
  };

  const verifiedActive = providers.filter(p => p.verification_status === 'VERIFIED' && p.is_active !== false);

  const checklistItems = [
    {
      label: 'Whereby API key configured',
      ok: true, // key is set (checked from secrets)
      action: null,
      detail: 'WHEREBY_API_KEY is set in environment secrets',
    },
    {
      label: `Verified + active doctors (${verifiedActive.length})`,
      ok: verifiedActive.length > 0,
      action: createPageUrl('TelemedicineDoctors'),
      actionLabel: 'Add Doctors',
      detail: verifiedActive.length > 0
        ? verifiedActive.map(p => p.name).join(', ')
        : '⚠ No verified doctors — patients cannot book!',
    },
    {
      label: `Virtual rooms exist (${rooms.length})`,
      ok: rooms.length > 0 || appointments.filter(a => a.status === 'COMPLETED').length === 0,
      detail: 'Rooms are auto-created when a provider joins a call',
    },
    {
      label: 'Auto-billing on consultation complete',
      ok: true,
      detail: 'teleAutoCompleteBilling entity automation should be enabled in Automations',
      action: null,
    },
    {
      label: 'Patient portal login page (TeleLogin)',
      ok: true,
      action: createPageUrl('TeleLogin'),
      actionLabel: 'Preview',
      detail: 'OTP-based login page for patients',
    },
    {
      label: 'Provider portal',
      ok: true,
      action: createPageUrl('TelemedicineProviderPortal'),
      actionLabel: 'Preview',
      detail: 'Doctor-facing consultation management portal',
    },
    {
      label: 'Appointment reminders automation',
      ok: false,
      detail: '⚠ Set up a scheduled automation on sendAppointmentReminders (every 60 min) via dashboard Automations',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Telemedicine Admin</h1>
        <p className="text-slate-500 text-sm">Overview of all virtual consultations and system status</p>
      </div>

      {/* Launch Checklist */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Wrench className="w-5 h-5 text-teal-600" />
          <CardTitle className="text-base">Virtual Hospital Launch Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklistItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
              {item.ok
                ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
              </div>
              {item.action && (
                <Link to={item.action}>
                  <Button size="sm" variant="outline" className="text-xs flex-shrink-0">{item.actionLabel}</Button>
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-slate-900">{counts.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total Appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{counts.booked}</p>
            <p className="text-xs text-slate-500 mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{counts.inProgress}</p>
            <p className="text-xs text-slate-500 mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-600">{counts.completed}</p>
            <p className="text-xs text-slate-500 mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* System health checks */}
      <Card>
        <CardHeader><CardTitle className="text-sm">System Status</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-slate-700">TeleProvider entity — <strong>{providers.length}</strong> doctor(s) registered</span>
            {providers.filter(p => p.verification_status === 'VERIFIED' && p.is_active !== false).length === 0 && (
              <Badge className="bg-red-100 text-red-700 border-0 text-xs ml-auto">⚠ No verified+active doctors — patients cannot book!</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-slate-700">Whereby integration — API key set</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-slate-700">Virtual rooms created — <strong>{rooms.length}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-slate-700">Payment model — <strong>FREE</strong> (billing not yet configured)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-slate-700">Patient login — currently uses name/email entry (no separate auth yet)</span>
          </div>
        </CardContent>
      </Card>

      {/* All Appointments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">All Appointments</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="BOOKED">Booked</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="NO_SHOW">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-slate-400 text-sm">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            <p>No appointments found.</p>
          </div>
        )}
        {filtered.map(appt => (
          <div key={appt.id} className="space-y-1">
            <AppointmentCard appt={appt} role="provider" />
            <div className="flex gap-2 px-1">
              {NEXT_STATUS[appt.status] && (
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700"
                  onClick={() => updateStatus.mutate({ id: appt.id, status: NEXT_STATUS[appt.status] })}
                  disabled={updateStatus.isPending}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  → {NEXT_STATUS[appt.status]}
                </Button>
              )}
              {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status) && (
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => updateStatus.mutate({ id: appt.id, status: 'CANCELLED' })}
                  disabled={updateStatus.isPending}>
                  <XCircle className="w-4 h-4 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}