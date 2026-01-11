import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Calendar,
  Clock,
  User,
  MapPin,
  Play,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DentalSchedule() {
  const queryClient = useQueryClient();
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showChairDialog, setShowChairDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedChair, setSelectedChair] = useState('all');

  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '',
    provider_id: '',
    start_time: '',
    end_time: '',
    type: 'consultation',
    reason: '',
    notes: ''
  });

  const [dentalExtForm, setDentalExtForm] = useState({
    chair_ref: '',
    appointment_type: 'consult',
    planned_procedure_codes: '',
    notes: ''
  });

  const [chairForm, setChairForm] = useState({
    chair_name: '',
    chair_type: 'general',
    active: true
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-start_time'),
  });

  const { data: dentalExtensions = [] } = useQuery({
    queryKey: ['dentalAppointmentExtensions'],
    queryFn: () => base44.entities.DentalAppointmentExtension.list(),
  });

  const { data: chairs = [] } = useQuery({
    queryKey: ['dentalChairs'],
    queryFn: () => base44.entities.DentalChair.filter({ active: true }),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data) => {
      const appointment = await base44.entities.Appointment.create(data.appointmentData);
      
      if (data.dentalExt) {
        await base44.entities.DentalAppointmentExtension.create({
          ...data.dentalExt,
          appointment_ref: appointment.id
        });
      }
      
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dentalAppointmentExtensions'] });
      setShowAppointmentDialog(false);
      toast.success('Appointment booked!');
    },
  });

  const createChairMutation = useMutation({
    mutationFn: (data) => base44.entities.DentalChair.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalChairs'] });
      setShowChairDialog(false);
      setChairForm({ chair_name: '', chair_type: 'general', active: true });
      toast.success('Chair added!');
    },
  });

  const startEncounterMutation = useMutation({
    mutationFn: async (appointment) => {
      return base44.entities.DentalEncounter.create({
        patient_ref: appointment.patient_id,
        encounter_datetime: new Date().toISOString(),
        provider_staff_ref: appointment.provider_id,
        chief_complaint: appointment.reason || 'Scheduled appointment',
        status: 'draft'
      });
    },
    onSuccess: (encounter) => {
      queryClient.invalidateQueries({ queryKey: ['dentalEncounters'] });
      toast.success('Encounter started!');
    },
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getStaffName = (staffId) => {
    const member = staff.find(s => s.id === staffId);
    if (!member) return 'Unknown';
    return member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown';
  };

  const getChairName = (chairRef) => {
    const chair = chairs.find(c => c.id === chairRef);
    return chair?.chair_name || 'Unassigned';
  };

  const getDentalExtension = (appointmentId) => {
    return dentalExtensions.find(ext => ext.appointment_ref === appointmentId);
  };

  // Filter appointments by date and location
  const filteredAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
    const dateMatch = aptDate === selectedDate;
    const locationMatch = !selectedLocation || apt.location_id === selectedLocation;
    
    let chairMatch = true;
    if (selectedChair !== 'all') {
      const ext = getDentalExtension(apt.id);
      chairMatch = ext?.chair_ref === selectedChair;
    }
    
    return dateMatch && locationMatch && chairMatch;
  });

  const missedAppointments = appointments.filter(apt => 
    apt.status === 'no-show' || 
    (apt.status === 'scheduled' && new Date(apt.start_time) < new Date())
  );

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    'checked-in': 'bg-purple-100 text-purple-700',
    'in-progress': 'bg-amber-100 text-amber-700',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-rose-100 text-rose-700',
    'no-show': 'bg-rose-100 text-rose-700'
  };

  const appointmentTypeColors = {
    consult: 'bg-blue-50 border-blue-200',
    cleaning: 'bg-emerald-50 border-emerald-200',
    filling: 'bg-amber-50 border-amber-200',
    extraction: 'bg-rose-50 border-rose-200',
    surgery: 'bg-purple-50 border-purple-200',
    ortho: 'bg-indigo-50 border-indigo-200',
    checkup: 'bg-teal-50 border-teal-200',
    other: 'bg-slate-50 border-slate-200'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dental Schedule</h1>
          <p className="text-slate-500 mt-1">Appointment scheduling and chair assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowChairDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Chair
          </Button>
          <Button onClick={() => setShowAppointmentDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Today's Appointments</p>
            <p className="text-3xl font-bold mt-1">{filteredAppointments.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Chairs</p>
            <p className="text-3xl font-bold mt-1">{chairs.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">In Progress</p>
            <p className="text-3xl font-bold mt-1">
              {appointments.filter(a => a.status === 'in-progress').length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Missed/No-Show</p>
            <p className="text-3xl font-bold mt-1">{missedAppointments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-xs mb-2 block">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-2 block">Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-2 block">Chair</Label>
              <Select value={selectedChair} onValueChange={setSelectedChair}>
                <SelectTrigger>
                  <SelectValue placeholder="All chairs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chairs</SelectItem>
                  {chairs.map(chair => (
                    <SelectItem key={chair.id} value={chair.id}>
                      {chair.chair_name} ({chair.chair_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule ({filteredAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="missed">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Missed ({missedAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="chairs">
            <MapPin className="w-4 h-4 mr-2" />
            Chairs ({chairs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No appointments</h3>
              <p className="text-slate-500 mt-1">No appointments scheduled for selected filters</p>
            </Card>
          ) : (
            filteredAppointments.map((apt) => {
              const dentalExt = getDentalExtension(apt.id);
              const appointmentTypeClass = dentalExt?.appointment_type ? 
                appointmentTypeColors[dentalExt.appointment_type] : 
                appointmentTypeColors.other;

              return (
                <Card key={apt.id} className={`p-5 border-2 ${appointmentTypeClass}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                        {dentalExt?.appointment_type && (
                          <Badge variant="outline">{dentalExt.appointment_type}</Badge>
                        )}
                        {dentalExt?.pre_auth_required && (
                          <Badge className="bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pre-auth Required
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Time
                          </p>
                          <p className="font-medium text-slate-900">
                            {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Patient
                          </p>
                          <p className="font-medium text-slate-900">{getPatientName(apt.patient_id)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Provider</p>
                          <p className="font-medium text-slate-900">{getStaffName(apt.provider_id)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Chair
                          </p>
                          <p className="font-medium text-slate-900">
                            {dentalExt?.chair_ref ? getChairName(dentalExt.chair_ref) : 'Unassigned'}
                          </p>
                        </div>
                      </div>

                      {apt.reason && (
                        <p className="text-sm text-slate-700 mt-2">
                          <span className="font-medium">Reason:</span> {apt.reason}
                        </p>
                      )}
                      {dentalExt?.planned_procedure_codes && (
                        <p className="text-xs text-slate-600 mt-1">
                          Planned: {dentalExt.planned_procedure_codes}
                        </p>
                      )}
                    </div>

                    {apt.status === 'scheduled' || apt.status === 'confirmed' || apt.status === 'checked-in' ? (
                      <Button
                        size="sm"
                        onClick={() => startEncounterMutation.mutate(apt)}
                        disabled={startEncounterMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Encounter
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="missed" className="space-y-3">
          {missedAppointments.map((apt) => (
            <Card key={apt.id} className="p-5 bg-rose-50 border-rose-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                  <p className="font-semibold text-slate-900 mt-2">{getPatientName(apt.patient_id)}</p>
                  <p className="text-sm text-slate-600">
                    {format(new Date(apt.start_time), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-sm text-slate-600">Provider: {getStaffName(apt.provider_id)}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="chairs" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {chairs.map((chair) => {
              const chairAppointments = filteredAppointments.filter(apt => {
                const ext = getDentalExtension(apt.id);
                return ext?.chair_ref === chair.id;
              });

              return (
                <Card key={chair.id} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">{chair.chair_name}</h3>
                  </div>
                  <Badge variant="outline">{chair.chair_type}</Badge>
                  <p className="text-sm text-slate-600 mt-2">
                    {chairAppointments.length} appointment(s) today
                  </p>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Book Appointment Dialog */}
      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Dental Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient *</Label>
                <Select value={appointmentForm.patient_id} onValueChange={(val) => setAppointmentForm({ ...appointmentForm, patient_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Provider *</Label>
                <Select value={appointmentForm.provider_id} onValueChange={(val) => setAppointmentForm({ ...appointmentForm, provider_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dentist" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={appointmentForm.start_time}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="datetime-local"
                  value={appointmentForm.end_time}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, end_time: e.target.value })}
                />
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Dental Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Appointment Type</Label>
                    <Select value={dentalExtForm.appointment_type} onValueChange={(val) => setDentalExtForm({ ...dentalExtForm, appointment_type: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consult">Consultation</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="filling">Filling</SelectItem>
                        <SelectItem value="extraction">Extraction</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="ortho">Orthodontic</SelectItem>
                        <SelectItem value="checkup">Check-up</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Chair Assignment</Label>
                    <Select value={dentalExtForm.chair_ref} onValueChange={(val) => setDentalExtForm({ ...dentalExtForm, chair_ref: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chair" />
                      </SelectTrigger>
                      <SelectContent>
                        {chairs.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.chair_name} ({c.chair_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Planned Procedure Codes</Label>
                  <Input
                    value={dentalExtForm.planned_procedure_codes}
                    onChange={(e) => setDentalExtForm({ ...dentalExtForm, planned_procedure_codes: e.target.value })}
                    placeholder="e.g., D0150, D1110"
                  />
                </div>
              </CardContent>
            </Card>

            <div>
              <Label>Reason</Label>
              <Textarea
                value={appointmentForm.reason}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAppointmentDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createAppointmentMutation.mutate({
                  appointmentData: {
                    ...appointmentForm,
                    start_time: new Date(appointmentForm.start_time).toISOString(),
                    end_time: new Date(appointmentForm.end_time).toISOString(),
                    type: appointmentForm.type,
                    status: 'scheduled'
                  },
                  dentalExt: dentalExtForm
                })}
              >
                Book Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Chair Dialog */}
      <Dialog open={showChairDialog} onOpenChange={setShowChairDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dental Chair</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Chair Name *</Label>
              <Input
                value={chairForm.chair_name}
                onChange={(e) => setChairForm({ ...chairForm, chair_name: e.target.value })}
                placeholder="e.g., Chair 1, Surgery Room"
              />
            </div>
            <div>
              <Label>Chair Type</Label>
              <Select value={chairForm.chair_type} onValueChange={(val) => setChairForm({ ...chairForm, chair_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="hygiene">Hygiene</SelectItem>
                  <SelectItem value="ortho">Orthodontic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowChairDialog(false)}>Cancel</Button>
              <Button onClick={() => createChairMutation.mutate(chairForm)}>
                Add Chair
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}