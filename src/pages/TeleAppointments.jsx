import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Search, Calendar, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-teal-100 text-teal-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-slate-100 text-slate-700',
};

export default function TeleAppointments() {
  const { selectedOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['teleAppointments', selectedOrgId],
    queryFn: () => base44.entities.TeleAppointment.filter({ organization_id: selectedOrgId }, '-scheduled_time', 100),
    enabled: !!selectedOrgId,
  });

  const filtered = appointments.filter(a => {
    const matchSearch =
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.provider_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Video className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tele Appointments</h1>
            <p className="text-teal-100 mt-1">Virtual consultations for your registered patients</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: appointments.length, color: 'text-slate-700' },
          { label: 'Booked', value: appointments.filter(a => a.status === 'BOOKED').length, color: 'text-blue-600' },
          { label: 'In Progress', value: appointments.filter(a => a.status === 'IN_PROGRESS').length, color: 'text-yellow-600' },
          { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, color: 'text-green-600' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search patient or provider..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
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

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading appointments...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No tele appointments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => (
            <Card key={appt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{appt.patient_name || 'Unknown Patient'}</p>
                        <Badge className={STATUS_COLORS[appt.status] || 'bg-slate-100 text-slate-700'}>
                          {appt.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{appt.visit_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />Dr. {appt.provider_name || '—'}</span>
                        {appt.scheduled_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(appt.scheduled_time), 'dd MMM yyyy, HH:mm')}
                          </span>
                        )}
                      </div>
                      {appt.patient_notes && <p className="text-xs text-slate-500 mt-1 italic">{appt.patient_notes}</p>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{appt.appointment_type}</p>
                    {appt.billing_amount_usd && <p className="text-teal-700 font-medium">${appt.billing_amount_usd}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}