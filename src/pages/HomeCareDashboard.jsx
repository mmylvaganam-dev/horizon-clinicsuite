import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Calendar,
  Activity,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function HomeCareDashboard() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: patients = [] } = useQuery({
    queryKey: ['homeCarePatients'],
    queryFn: () => base44.entities.Patient.filter({ 
      status: 'active'
    }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareStaff'],
    queryFn: () => base44.entities.StaffProfile.filter({ 
      role: 'home_nurse',
      status: 'active'
    }),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['homeCareSchedules'],
    queryFn: () => base44.entities.HomeCareSchedule.list('-schedule_date'),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['homeCareReports'],
    queryFn: () => base44.entities.HomeCareReport.list('-report_date'),
  });

  const todaySchedules = schedules.filter(s => s.schedule_date === dateFilter);
  const completedToday = todaySchedules.filter(s => s.status === 'completed').length;
  const pendingToday = todaySchedules.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length;

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.full_name || 'Unknown';
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-rose-100 text-rose-700',
    rescheduled: 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Dashboard</h1>
        <p className="text-slate-500 mt-1">Comprehensive home care service management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => navigate(createPageUrl('HomeCarePatients'))}
        >
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Patients</p>
            <p className="text-3xl font-bold mt-1">{patients.length}</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => navigate(createPageUrl('HomeCareStaff'))}
        >
          <CardContent className="p-6">
            <Activity className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Staff</p>
            <p className="text-3xl font-bold mt-1">{staff.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Today's Visits</p>
            <p className="text-3xl font-bold mt-1">{todaySchedules.length}</p>
            <p className="text-xs opacity-80 mt-1">{pendingToday} pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Completed Today</p>
            <p className="text-3xl font-bold mt-1">{completedToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-blue-200 bg-blue-50"
          onClick={() => navigate(createPageUrl('HomeCarePatients'))}
        >
          <Users className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Patients</h3>
          <p className="text-sm text-slate-600">Manage home care patients</p>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-emerald-200 bg-emerald-50"
          onClick={() => navigate(createPageUrl('HomeCareStaff'))}
        >
          <Activity className="w-8 h-8 text-emerald-600 mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Staff</h3>
          <p className="text-sm text-slate-600">Manage nursing staff</p>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-purple-200 bg-purple-50"
          onClick={() => navigate(createPageUrl('HomeCareScheduling'))}
        >
          <Calendar className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Scheduling</h3>
          <p className="text-sm text-slate-600">Schedule and manage visits</p>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-amber-200 bg-amber-50"
          onClick={() => navigate(createPageUrl('HomeCareReports'))}
        >
          <FileText className="w-8 h-8 text-amber-600 mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Reports</h3>
          <p className="text-sm text-slate-600">Daily reports and notes</p>
        </Card>
      </div>

      {/* Service Categories */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Home Care Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <h4 className="font-bold text-lg text-blue-900 mb-2">Nursing Officer Services</h4>
              <p className="text-sm text-slate-600 mb-3">One-time clinical procedures</p>
              <div className="space-y-1 text-sm">
                <p className="text-slate-700">• NG Tubing</p>
                <p className="text-slate-700">• Urinary Catheter Insertion/Changing</p>
                <p className="text-slate-700">• IV Injection/Infusion</p>
                <p className="text-slate-700">• Wound Care</p>
                <p className="text-slate-700">• Medication Administration</p>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
              <h4 className="font-bold text-lg text-emerald-900 mb-2">Home Care Worker Services</h4>
              <p className="text-sm text-slate-600 mb-3">Long-term care (days to months)</p>
              <div className="space-y-1 text-sm">
                <p className="text-slate-700">• ADL Support (Day & Night / Day / Night)</p>
                <p className="text-slate-700">• Part-time ADL Support</p>
                <p className="text-slate-700">• Housekeeping</p>
                <p className="text-slate-700">• Personal Care Assistance</p>
                <p className="text-xs text-emerald-700 mt-2 font-medium">Duration: Days to Months</p>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Today's Schedule</h3>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-48"
            />
          </div>

          {todaySchedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No visits scheduled for {format(new Date(dateFilter), 'MMM d, yyyy')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule) => (
                <Card key={schedule.id} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 text-center">
                        <Clock className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                        <p className="text-sm font-medium">{schedule.time_from}</p>
                        <p className="text-xs text-slate-500">{schedule.time_to}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{getPatientName(schedule.patient_id)}</p>
                        <p className="text-sm text-slate-600">{getStaffName(schedule.staff_id)}</p>
                        <p className="text-xs text-slate-500 mt-1">{schedule.service_type}</p>
                      </div>
                      <Badge className={statusColors[schedule.status]}>
                        {schedule.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Daily Reports</h3>
            <Button variant="outline" onClick={() => navigate(createPageUrl('HomeCareReports'))}>
              View All
            </Button>
          </div>

          {reports.slice(0, 3).length === 0 ? (
            <p className="text-center text-slate-500 py-8">No reports yet</p>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 3).map((report) => (
                <Card key={report.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{format(new Date(report.report_date), 'EEEE, MMM d, yyyy')}</p>
                      <p className="text-sm text-slate-500">{report.shift_type} shift - {report.incoming_nurse}</p>
                    </div>
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}