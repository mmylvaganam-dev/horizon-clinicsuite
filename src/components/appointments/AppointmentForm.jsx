import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const appointmentTypes = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'check-up', label: 'Check-up' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'lab_work', label: 'Lab Work' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No Show' },
];

export default function AppointmentForm({ open, onOpenChange, appointment, patients = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    date: '',
    time: '',
    duration: 30,
    type: 'consultation',
    status: 'scheduled',
    provider: '',
    reason: '',
    notes: '',
  });

  // Load all providers from the system
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['staffProfiles'],
    queryFn: () => base44.entities.StaffProfile.list(),
    enabled: open,
  });

  const { data: gpProfiles = [] } = useQuery({
    queryKey: ['gpProfiles'],
    queryFn: () => base44.entities.GPProfile.list(),
    enabled: open,
  });

  const { data: specialistProfiles = [] } = useQuery({
    queryKey: ['specialistProfiles'],
    queryFn: () => base44.entities.SpecialistProfile.list(),
    enabled: open,
  });

  const { data: thirdPartyProviders = [] } = useQuery({
    queryKey: ['thirdPartyProviders'],
    queryFn: () => base44.entities.ThirdPartyProviderProfile.list(),
    enabled: open,
  });

  // Combine all providers into one list
  const allProviders = [
    ...staffProfiles.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, type: 'Staff' })),
    ...gpProfiles.map(g => ({ id: g.id, name: g.doctor_name, type: 'GP' })),
    ...specialistProfiles.map(sp => ({ id: sp.id, name: sp.specialist_name, type: sp.specialty })),
    ...thirdPartyProviders.map(tp => ({ id: tp.id, name: tp.provider_name, type: tp.specialty })),
  ];

  useEffect(() => {
    if (appointment) {
      // Convert start_time to date and time for the form
      const startDate = appointment.start_time ? new Date(appointment.start_time) : null;
      const endDate = appointment.end_time ? new Date(appointment.end_time) : null;
      
      setFormData({
        patient_id: appointment.patient_id || '',
        patient_name: appointment.patient_name || '',
        date: startDate ? startDate.toISOString().split('T')[0] : '',
        time: startDate ? startDate.toTimeString().substring(0, 5) : '',
        duration: endDate && startDate ? Math.round((endDate - startDate) / 60000) : 30,
        type: appointment.type || 'consultation',
        status: appointment.status || 'scheduled',
        provider: appointment.provider_id || '',
        reason: appointment.reason || '',
        notes: appointment.notes || '',
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        patient_id: '',
        patient_name: '',
        date: today,
        time: '09:00',
        duration: 30,
        type: 'consultation',
        status: 'scheduled',
        provider: '',
        reason: '',
        notes: '',
      });
    }
  }, [appointment, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert date + time to start_time and end_time (datetime format)
    const startDateTime = new Date(`${formData.date}T${formData.time}`);
    const endDateTime = new Date(startDateTime.getTime() + (formData.duration || 30) * 60000);
    
    const appointmentData = {
      patient_id: formData.patient_id,
      provider_id: formData.provider,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status: formData.status,
      type: formData.type,
      reason: formData.reason,
      notes: formData.notes,
    };
    
    onSubmit(appointmentData);
  };

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setFormData(prev => ({
      ...prev,
      patient_id: patientId,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {appointment ? 'Edit Appointment' : 'Schedule Appointment'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <Select value={formData.patient_id} onValueChange={handlePatientChange}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select 
                value={formData.duration?.toString()} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, duration: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider / Doctor</Label>
              <Select 
                value={formData.provider} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {allProviders.length === 0 ? (
                    <SelectItem value="none" disabled>No providers found</SelectItem>
                  ) : (
                    allProviders.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name} ({provider.type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Brief description..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {appointment ? 'Update' : 'Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}