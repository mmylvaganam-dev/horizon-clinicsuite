import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Video
} from 'lucide-react';
import { createPageUrl } from '../utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, startOfWeek, isSameDay } from 'date-fns';
import { formatSL } from '@/components/utils/dateUtils';
import AppointmentForm from '../components/appointments/AppointmentForm';
import LinkedRecords from '../components/shared/LinkedRecords';
import TelehealthPatientPreview from '../components/appointments/TelehealthPatientPreview';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'in-progress': 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  'no-show': 'bg-red-100 text-red-700 border-red-200',
};

const typeColors = {
  consultation: 'bg-teal-500',
  'follow-up': 'bg-blue-500',
  procedure: 'bg-violet-500',
  emergency: 'bg-red-500',
  'check-up': 'bg-emerald-500',
  vaccination: 'bg-amber-500',
  lab_work: 'bg-pink-500',
  other: 'bg-slate-500',
};

export default function Appointments() {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedAppointment, setExpandedAppointment] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.Appointment.filter({ organization_id: selectedOrgId }, '-start_time');
    },
    enabled: !!selectedOrgId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.Patient.filter({ organization_id: selectedOrgId });
    },
    enabled: !!selectedOrgId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create({ ...data, organization_id: selectedOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setFormOpen(false);
      setEditingAppointment(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setDeleteId(null);
    },
  });

  const handleSubmit = (data) => {
    if (editingAppointment) {
      updateMutation.mutate({ id: editingAppointment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredAppointments = appointments.filter(apt => {
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesStatus;
  });

  const getAppointmentsForDay = (date) => {
    const dateStr = formatSL(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(apt => {
      if (!apt.start_time) return false;
      const aptDate = formatSL(new Date(apt.start_time), 'yyyy-MM-dd');
      return aptDate === dateStr;
    }).map(apt => {
      const startTime = new Date(apt.start_time);
      return {
        ...apt,
        time: formatSL(startTime, 'HH:mm'),
        date: formatSL(startTime, 'yyyy-MM-dd'),
        duration: apt.end_time ? Math.round((new Date(apt.end_time) - startTime) / 60000) : 30,
      };
    });
  };

  const todayAppointments = getAppointmentsForDay(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Appointments</h1>
            <p className="text-slate-500 mt-1">{todayAppointments.length} appointments today</p>
          </div>
          <PageInfoTooltip
            title="Appointments"
            description="Book, view, and manage all patient appointments. Navigate the week calendar or click a day to see that day's appointments."
            useCases={[
              "Book a new appointment — click 'New Appointment'",
              "View a provider's schedule for the current week",
              "Update appointment status (Scheduled → Confirmed → Completed)",
              "Click an appointment card to expand and see linked records"
            ]}
            bestPractices={[
              "Use the 'Today' button to quickly jump to today's view",
              "Filter by status to quickly find pending or cancelled appointments",
              "Click the patient name in the expanded view to open their full profile",
              "Telehealth appointments show a video icon — click to launch the consultation"
            ]}
          />
        </div>
        <Button 
          onClick={() => { setEditingAppointment(null); setFormOpen(true); }}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Week Navigation */}
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="font-medium text-slate-900 ml-2">
              {formatSL(weekStart, 'MMM d')} - {formatSL(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Week View */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={day.toISOString()} className="min-h-[200px]">
                <div className={`
                  text-center p-2 rounded-lg mb-2
                  ${isToday ? 'bg-teal-500 text-white' : 'bg-slate-100'}
                `}>
                  <p className="text-xs font-medium">{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', weekday: 'short' }).format(day)}</p>
                  <p className="text-lg font-bold">{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', day: 'numeric' }).format(day)}</p>
                </div>
                <div className="space-y-1">
                  {loadingAppointments ? (
                    <Skeleton className="h-12 rounded-lg" />
                  ) : (
                    dayAppointments.slice(0, 4).map((apt) => {
                      const patient = patients.find(p => p.id === apt.patient_id);
                      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
                      
                      return (
                        <div
                          key={apt.id}
                          onClick={() => { 
                            const patient = patients.find(p => p.id === apt.patient_id);
                            if (patient) {
                              window.location.href = createPageUrl(`PatientDetails?id=${patient.id}`);
                            }
                          }}
                          className={`
                            p-2 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-105
                            ${typeColors[apt.type] || 'bg-slate-500'} text-white text-xs
                          `}
                        >
                          <p className="font-medium truncate">{apt.time}</p>
                          <p className="truncate opacity-90">{patientName}</p>
                        </div>
                      );
                    })
                  )}
                  {dayAppointments.length > 4 && (
                    <p className="text-xs text-slate-500 text-center">
                      +{dayAppointments.length - 4} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Appointment List for Selected Day */}
      <Card className="bg-white border-0 shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-slate-900">
            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDate)}
          </h2>
        </div>
        <div className="divide-y">
          {loadingAppointments ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ))
          ) : getAppointmentsForDay(selectedDate).length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No appointments scheduled for this day</p>
            </div>
          ) : (
            getAppointmentsForDay(selectedDate).map((apt) => {
              const patient = patients.find(p => p.id === apt.patient_id);
              const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';
              
              return (
                <div key={apt.id}>
                  <div 
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedAppointment(expandedAppointment === apt.id ? null : apt.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-1 h-16 rounded-full ${typeColors[apt.type] || 'bg-slate-500'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{apt.time}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{apt.duration || 30} min</span>
                          {apt.is_telehealth && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 ml-2">
                              <Video className="w-3 h-3 mr-1" />
                              Telehealth
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{patientName}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {apt.type?.replace(/[_-]/g, ' ')} • {apt.reason || 'No reason specified'}
                        </p>
                      </div>
                      <Badge variant="outline" className={`${statusColors[apt.status] || statusColors.scheduled} border`}>
                        {apt.status?.replace('-', ' ') || 'scheduled'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { 
                            e.stopPropagation();
                            setEditingAppointment(apt); 
                            setFormOpen(true); 
                          }}
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(apt.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {expandedAppointment === apt.id && (
                    <div className="ml-8 mb-4 px-4 pb-4 border-t pt-4">
                      {apt.is_telehealth ? (
                        <TelehealthPatientPreview 
                          patientId={apt.patient_id} 
                          appointmentId={apt.id}
                          teleHealthLink={apt.telehealth_link}
                        />
                      ) : (
                        <LinkedRecords recordType="Appointment" recordId={apt.id} />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Appointment Form */}
      <AppointmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editingAppointment}
        patients={patients}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}