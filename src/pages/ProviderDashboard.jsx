import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Stethoscope,
  Activity,
  Users,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProviderDashboard() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-start_time'),
  });

  // Service categories
  const services = [
    { name: 'General Service', icon: Stethoscope, color: 'from-blue-500 to-blue-600' },
    { name: 'OPD Service', icon: Users, color: 'from-teal-500 to-teal-600' },
    { name: 'General Procedure', icon: Activity, color: 'from-purple-500 to-purple-600' },
    { name: 'Dental Practice', icon: Stethoscope, color: 'from-rose-500 to-rose-600' },
    { name: 'Laboratory Service', icon: Activity, color: 'from-emerald-500 to-emerald-600' },
    { name: 'Pharmacy Service', icon: Activity, color: 'from-indigo-500 to-indigo-600' },
  ];

  // Mock provider data
  const provider = {
    name: 'Dr. Nirmalini Kathiralingam',
    specialty: 'General',
    stats: {
      totalSessions: 1,
      sessionsCompleted: 0,
      appointmentsCancelled: 0,
      seen: 0,
      paid: 0,
      home: 0,
      cancel: 0,
      noshow: 0,
      unscheduled: 0,
      notScheduled: 0
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Provider Dashboard</h1>
          <p className="text-slate-500 mt-1">Track provider performance and appointments</p>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Provider or Specialty</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {services.map((service, idx) => (
          <Card key={idx} className="hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mx-auto mb-3`}>
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-slate-900">{service.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Provider Stats Card */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{provider.name}</h2>
              <Badge className="bg-indigo-600 mb-4">{provider.specialty}</Badge>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{provider.stats.totalSessions}</p>
                  <p className="text-xs text-slate-600 mt-1">Total Sessions</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{provider.stats.seen}</p>
                  <p className="text-xs text-slate-600 mt-1">Seen</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{provider.stats.paid}</p>
                  <p className="text-xs text-slate-600 mt-1">Paid</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{provider.stats.home}</p>
                  <p className="text-xs text-slate-600 mt-1">Home</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-rose-600">{provider.stats.cancel}</p>
                  <p className="text-xs text-slate-600 mt-1">Cancel</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{provider.stats.appointmentsCancelled}</p>
                  <p className="text-xs text-slate-600 mt-1">Appointments Cancelled</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-slate-600">{provider.stats.unscheduled}</p>
                  <p className="text-xs text-slate-600 mt-1">Unscheduled</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-slate-600">{provider.stats.notScheduled}</p>
                  <p className="text-xs text-slate-600 mt-1">Not Scheduled</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-slate-600">{provider.stats.sessionsCompleted}</p>
                  <p className="text-xs text-slate-600 mt-1">Sessions Cancelled</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Sessions</p>
            <p className="text-3xl font-bold mt-1">{provider.stats.totalSessions}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Patients Seen</p>
            <p className="text-3xl font-bold mt-1">{provider.stats.seen}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <XCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Cancelled</p>
            <p className="text-3xl font-bold mt-1">{provider.stats.appointmentsCancelled}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">No Show</p>
            <p className="text-3xl font-bold mt-1">{provider.stats.noshow}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}