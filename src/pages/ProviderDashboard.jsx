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
  TrendingUp,
  FileText,
  AlertTriangle,
  Pill,
  Eye,
  ExternalLink
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function ProviderDashboard() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  // Get appointments for current provider only
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', currentUser?.id],
    queryFn: async () => {
      const allAppointments = await base44.entities.Appointment.list('-start_time');
      // Filter to show only this provider's appointments
      return allAppointments.filter(apt => apt.provider_id === currentUser?.id);
    },
    enabled: !!currentUser,
  });

  // Get prescriptions for current provider
  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions', currentUser?.id],
    queryFn: async () => {
      const allPrescriptions = await base44.entities.Prescription.list('-prescribed_date');
      return allPrescriptions.filter(p => p.prescriber_id === currentUser?.id);
    },
    enabled: !!currentUser,
  });

  // Get patient alerts from medical records
  const { data: alerts = [] } = useQuery({
    queryKey: ['patientAlerts', appointments],
    queryFn: async () => {
      if (appointments.length === 0) return [];
      const appointmentPatients = appointments.map(a => a.patient_id);
      const records = await base44.entities.MedicalRecord.list();
      return records
        .filter(r => appointmentPatients.includes(r.patient_id))
        .filter(r => r.diagnosis_code || r.chief_complaint)
        .slice(0, 10);
    },
    enabled: appointments.length > 0,
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

  const navigate = useNavigate();
  
  // Calculate stats from actual appointments
  const todayAppointments = appointments.filter(apt => {
    if (!apt.start_time) return false;
    return isSameDay(new Date(apt.start_time), new Date(dateFrom));
  });

  const stats = {
    totalAppointments: appointments.length,
    todayTotal: todayAppointments.length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    inProgress: todayAppointments.filter(a => a.status === 'in-progress').length,
    scheduled: todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
    cancelled: todayAppointments.filter(a => a.status === 'cancelled').length,
    noShow: todayAppointments.filter(a => a.status === 'no-show').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Provider Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {currentUser?.full_name || 'Provider'} - {stats.todayTotal} appointments today
          </p>
        </div>
        <Button onClick={() => navigate(createPageUrl('Appointments'))}>
          <Calendar className="w-4 h-4 mr-2" />
          All Appointments
        </Button>
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

      {/* My Appointments for Today */}
      <Card className="border-2 border-indigo-200">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <h2 className="text-xl font-bold">My Appointments - {format(new Date(dateFrom), 'MMMM d, yyyy')}</h2>
          <p className="text-sm opacity-90">{stats.todayTotal} appointments scheduled</p>
        </div>
        <CardContent className="p-0">
          {todayAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No appointments for selected date</p>
            </div>
          ) : (
            <div className="divide-y">
              {todayAppointments.map(apt => {
                const patient = patients.find(p => p.id === apt.patient_id);
                const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
                
                return (
                  <div 
                    key={apt.id} 
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (patient) {
                        navigate(createPageUrl(`PatientDetails?id=${patient.id}`));
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">{format(new Date(apt.start_time), 'HH:mm')}</p>
                        <p className="text-xs text-slate-500">{apt.duration || 30} min</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg text-slate-900">{patientName}</p>
                        <p className="text-sm text-slate-600">{apt.type?.replace(/[_-]/g, ' ')} • {apt.reason || 'No reason'}</p>
                        {patient?.phn && (
                          <p className="text-xs text-slate-500 mt-1">PHN: {patient.phn}</p>
                        )}
                      </div>
                      <Badge className={
                        apt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        apt.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                        apt.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {apt.status?.replace('-', ' ') || 'scheduled'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (patient) {
                            navigate(createPageUrl(`EMR?patientId=${patient.id}`));
                          }
                        }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        EMR
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Today's Appointments</p>
            <p className="text-3xl font-bold mt-1">{stats.todayTotal}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Completed</p>
            <p className="text-3xl font-bold mt-1">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <Activity className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">In Progress</p>
            <p className="text-3xl font-bold mt-1">{stats.inProgress}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <XCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Cancelled</p>
            <p className="text-3xl font-bold mt-1">{stats.cancelled}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}