import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Search, User, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-teal-100 text-teal-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-slate-100 text-slate-700',
};

const NEXT_STATUS = {
  BOOKED: 'CONFIRMED',
  CONFIRMED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

export default function TeleAppointments() {
  const { selectedOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [joining, setJoining] = useState(null);
  const qc = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['teleAppointments', selectedOrgId],
    queryFn: () => base44.entities.TeleAppointment.list('-scheduled_time', 100),
    refetchInterval: 30000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TeleAppointment.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teleAppointments'] }),
  });

  const handleJoin = async (appt) => {
    setJoining(appt.id);
    try {
      const res = await base44.functions.invoke('joinTeleRoom', {
        appointment_id: appt.id,
        role: 'provider',
      });
      const url = res?.data?.url;
      if (url) {
        window.open(url, '_blank');
        qc.invalidateQueries({ queryKey: ['teleAppointments'] });
      } else {
        alert(res?.data?.error || 'Could not get room URL');
      }
    } finally {
      setJoining(null);
    }
  };

  const filtered = appointments.filter(a => {
    const matchSearch =
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.provider_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const inProgress = appointments.filter(a => a.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tele Appointments</h1>
              <p className="text-teal-100 mt-1">Virtual consultations for your registered patients</p>
            </div>
          </div>
          <Link to={createPageUrl('TelemedicineProviderPortal')}>
            <Button className="bg-white text-teal-700 hover:bg-teal-50">
              Provider Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Live call alert */}
      {inProgress.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-800 font-medium">
            <Video className="w-5 h-5" />
            {inProgress.length} consultation{inProgress.length > 1 ? 's' : ''} currently in progress
          </div>
          <Button
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={() => handleJoin(inProgress[0])}
            disabled={joining === inProgress[0].id}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Join Call
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: appointments.length, color: 'text-slate-700' },
          { label: 'Pending/Confirmed', value: appointments.filter(a => ['BOOKED', 'CONFIRMED'].includes(a.status)).length, color: 'text-blue-600' },
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
            <Card key={appt.id} className={`hover:shadow-md transition-shadow ${appt.status === 'IN_PROGRESS' ? 'border-yellow-400' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${appt.status === 'IN_PROGRESS' ? 'bg-yellow-100' : 'bg-teal-100'}`}>
                      <Video className={`w-5 h-5 ${appt.status === 'IN_PROGRESS' ? 'text-yellow-600' : 'text-teal-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{appt.patient_name || 'Unknown Patient'}</p>
                        <Badge className={STATUS_COLORS[appt.status] || 'bg-slate-100 text-slate-700'}>
                          {appt.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{appt.visit_type || 'VIDEO'}</Badge>
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
                      {appt.patient_notes && <p className="text-xs text-slate-500 mt-1 italic truncate">"{appt.patient_notes}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status advance */}
                    {NEXT_STATUS[appt.status] && appt.status !== 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                        onClick={() => updateStatus.mutate({ id: appt.id, status: NEXT_STATUS[appt.status] })}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {NEXT_STATUS[appt.status]}
                      </Button>
                    )}
                    {/* Start/Join Call */}
                    {['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status) && (appt.visit_type === 'VIDEO' || !appt.visit_type) && (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-xs gap-1"
                        onClick={() => handleJoin(appt)}
                        disabled={joining === appt.id}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {joining === appt.id ? 'Connecting...' : appt.status === 'IN_PROGRESS' ? 'Rejoin' : 'Start Call'}
                      </Button>
                    )}
                    {/* Complete */}
                    {appt.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs"
                        onClick={() => updateStatus.mutate({ id: appt.id, status: 'COMPLETED' })}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    )}
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