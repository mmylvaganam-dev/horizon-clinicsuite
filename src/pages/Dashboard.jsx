import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Users, Calendar, FileText, Activity, TrendingUp, Clock } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import AppointmentsList from '../components/dashboard/AppointmentsList';
import RecentPatients from '../components/dashboard/RecentPatients';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 50),
  });

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 100),
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['records'],
    queryFn: () => base44.entities.MedicalRecord.list('-created_date', 50),
  });

  const todayAppointments = appointments.filter(apt => apt.date === today);
  const activePatients = patients.filter(p => p.status === 'active' || !p.status).length;
  const completedToday = todayAppointments.filter(apt => apt.status === 'completed').length;

  const isLoading = loadingPatients || loadingAppointments || loadingRecords;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome to Horizon ClinicSuite</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Patients"
              value={patients.length}
              subtitle={`${activePatients} active`}
              icon={Users}
              color="teal"
            />
            <StatCard
              title="Today's Appointments"
              value={todayAppointments.length}
              subtitle={`${completedToday} completed`}
              icon={Calendar}
              color="blue"
            />
            <StatCard
              title="Medical Records"
              value={records.length}
              icon={FileText}
              color="violet"
            />
            <StatCard
              title="This Month"
              value={appointments.filter(a => a.date?.startsWith(format(new Date(), 'yyyy-MM'))).length}
              subtitle="appointments"
              icon={TrendingUp}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </>
        ) : (
          <>
            <AppointmentsList 
              appointments={todayAppointments.slice(0, 5)} 
              onViewAll={() => navigate(createPageUrl('Appointments'))}
            />
            <RecentPatients 
              patients={patients.slice(0, 5)} 
              onViewAll={() => navigate(createPageUrl('Patients'))}
            />
          </>
        )}
      </div>
    </div>
  );
}