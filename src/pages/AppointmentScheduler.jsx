import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/components/OrganizationProvider';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'check-up', label: 'Check-up' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'lab_work', label: 'Lab Work' },
  { value: 'other', label: 'Other' },
];

export default function AppointmentScheduler() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    location_id: '',
    provider_id: '',
    type: 'consultation',
    start_time: '',
    end_time: '',
    reason: '',
    notes: '',
    is_telehealth: false,
  });

  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();

  // Fetch required data
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', selectedOrgId],
    queryFn: () => base44.entities.Location.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['staffProfiles', selectedOrgId],
    queryFn: () => base44.entities.StaffProfile.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', selectedOrgId, format(currentMonth, 'yyyy-MM')],
    queryFn: () => base44.entities.Appointment.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const startDateTime = new Date(`${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_time}`);

      if (startDateTime >= endDateTime) {
        throw new Error('End time must be after start time');
      }

      return base44.entities.Appointment.create({
        organization_id: selectedOrgId,
        patient_id: formData.patient_id,
        location_id: formData.location_id,
        provider_id: formData.provider_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        type: formData.type,
        reason: formData.reason,
        notes: formData.notes,
        is_telehealth: formData.is_telehealth,
        status: 'scheduled',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment scheduled successfully');
      setShowDialog(false);
      setFormData({
        patient_id: '',
        location_id: '',
        provider_id: '',
        type: 'consultation',
        start_time: '',
        end_time: '',
        reason: '',
        notes: '',
        is_telehealth: false,
      });
    },
    onError: (error) => toast.error(error.message || 'Failed to create appointment'),
  });

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setFormData({ ...formData, start_time: format(date, "yyyy-MM-dd'T'09:00") });
    setShowDialog(true);
  };

  const appointmentsForMonth = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    return isSameMonth(aptDate, currentMonth);
  });

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getAppointmentsForDay = (day) => {
    return appointmentsForMonth.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return isSameDay(aptDate, day);
    });
  };

  const selectedPatient = patients.find(p => p.id === formData.patient_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Appointment Scheduler</h1>
        <Button onClick={() => setShowDialog(true)} className="bg-teal-600 hover:bg-teal-700">
          <Calendar className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              ← Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              Next →
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map(day => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                onClick={() => isCurrentMonth && handleDateClick(day)}
                className={`min-h-24 p-2 rounded-lg border cursor-pointer transition-all ${
                  isCurrentMonth
                    ? 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-md'
                    : 'bg-slate-50 border-slate-100 cursor-not-allowed'
                } ${isToday ? 'bg-teal-50 border-teal-300' : ''}`}
              >
                <p className={`text-sm font-semibold mb-1 ${
                  isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                } ${isToday ? 'text-teal-700' : ''}`}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 2).map(apt => (
                    <div
                      key={apt.id}
                      className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 truncate"
                    >
                      {format(new Date(apt.start_time), 'HH:mm')}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <p className="text-xs text-slate-500">+{dayAppointments.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? `Schedule for ${format(selectedDate, 'MMM d, yyyy')}` : 'New Appointment'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient Selection */}
            <div>
              <Label>Patient *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Selection */}
            <div>
              <Label>Location *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      <MapPin className="w-4 h-4 mr-2 inline" />
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provider Selection */}
            <div>
              <Label>Provider *</Label>
              <Select
                value={formData.provider_id}
                onValueChange={(value) => setFormData({ ...formData, provider_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {staffProfiles.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <User className="w-4 h-4 mr-2 inline" />
                      {staff.full_name || staff.first_name} {staff.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Appointment Type */}
            <div>
              <Label>Appointment Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <Label>Reason for Visit</Label>
              <Input
                placeholder="e.g., Annual checkup"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div>
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any special instructions or notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-20"
              />
            </div>

            {/* Telehealth Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="telehealth"
                checked={formData.is_telehealth}
                onChange={(e) => setFormData({ ...formData, is_telehealth: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="telehealth" className="cursor-pointer">Virtual/Telehealth Appointment</Label>
            </div>

            {/* Summary */}
            {selectedPatient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                <p className="text-sm font-semibold text-blue-900">Appointment Summary</p>
                <p className="text-xs text-blue-700"><strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p className="text-xs text-blue-700"><strong>Type:</strong> {APPOINTMENT_TYPES.find(t => t.value === formData.type)?.label}</p>
                {formData.start_time && (
                  <p className="text-xs text-blue-700">
                    <strong>Date & Time:</strong> {format(new Date(formData.start_time), 'MMM d, yyyy HH:mm')}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createAppointmentMutation.mutate()}
                disabled={
                  !formData.patient_id ||
                  !formData.location_id ||
                  !formData.provider_id ||
                  !formData.start_time ||
                  !formData.end_time ||
                  createAppointmentMutation.isPending
                }
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {createAppointmentMutation.isPending ? 'Scheduling...' : 'Schedule Appointment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}