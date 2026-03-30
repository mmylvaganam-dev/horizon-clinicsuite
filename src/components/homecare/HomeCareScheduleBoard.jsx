import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, User, Clock, MapPin, Stethoscope, GripVertical, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const SERVICE_TYPES = [
  { value: 'nursing', label: 'Nursing Care' },
  { value: 'wound_care', label: 'Wound Care' },
  { value: 'medication', label: 'Medication Admin' },
  { value: 'monitoring', label: 'Health Monitoring' },
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'assistance', label: 'Daily Living Assist' },
  { value: 'other', label: 'Other' },
];

const STAFF_COLORS = [
  'border-l-blue-500 bg-blue-50',
  'border-l-purple-500 bg-purple-50',
  'border-l-teal-500 bg-teal-50',
  'border-l-amber-500 bg-amber-50',
  'border-l-rose-500 bg-rose-50',
  'border-l-emerald-500 bg-emerald-50',
];

const PATIENT_COLORS = [
  'bg-sky-100 border-sky-300 text-sky-800',
  'bg-violet-100 border-violet-300 text-violet-800',
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-lime-100 border-lime-300 text-lime-800',
];

function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function hasTimeOverlap(existingFrom, existingTo, newFrom, newTo) {
  const eFrom = timeToMinutes(existingFrom);
  const eTo = timeToMinutes(existingTo);
  const nFrom = timeToMinutes(newFrom);
  const nTo = timeToMinutes(newTo);
  return nFrom < eTo && nTo > eFrom;
}

export default function HomeCareScheduleBoard({ patients, staff, schedules, selectedDate, onScheduleCreated }) {
  const queryClient = useQueryClient();
  const [pendingAssign, setPendingAssign] = useState(null); // { patient, staffMember }
  const [assignForm, setAssignForm] = useState({ time_from: '08:00', time_to: '10:00', service_type: 'nursing', notes: '' });
  const [conflictInfo, setConflictInfo] = useState(null);

  const dateSchedules = schedules.filter(s =>
    s.schedule_date === selectedDate && !['cancelled', 'completed'].includes(s.status)
  );

  // Patients that already have a schedule on this date
  const scheduledPatientIds = new Set(dateSchedules.map(s => s.patient_id));
  const unscheduledPatients = patients.filter(p => !scheduledPatientIds.has(p.id));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareSchedules'] });
      setPendingAssign(null);
      setConflictInfo(null);
      toast.success('Visit scheduled!');
      if (onScheduleCreated) onScheduleCreated();
    },
    onError: (e) => toast.error(e.message || 'Failed to schedule'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HomeCareSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareSchedules'] });
      toast.success('Schedule updated!');
    },
  });

  function checkConflicts(staffId, timeFrom, timeTo, excludeScheduleId = null) {
    return dateSchedules.filter(s =>
      s.staff_id === staffId &&
      s.id !== excludeScheduleId &&
      hasTimeOverlap(s.time_from, s.time_to, timeFrom, timeTo)
    );
  }

  function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const destId = destination.droppableId;
    if (!destId.startsWith('staff-')) return;

    // Dropped onto a staff column
    const staffId = destId.replace('staff-', '');
    const staffMember = staff.find(s => s.id === staffId);
    const patient = patients.find(p => p.id === draggableId);

    if (!patient || !staffMember) return;

    // Open confirmation dialog
    setPendingAssign({ patient, staffMember });
    setAssignForm({ time_from: '08:00', time_to: '10:00', service_type: 'nursing', notes: '' });
    setConflictInfo(null);
  }

  function handleTimeChange(field, value) {
    const updated = { ...assignForm, [field]: value };
    setAssignForm(updated);
    if (pendingAssign && updated.time_from && updated.time_to) {
      const conflicts = checkConflicts(pendingAssign.staffMember.id, updated.time_from, updated.time_to);
      setConflictInfo(conflicts.length > 0 ? conflicts : null);
    }
  }

  function handleConfirmAssign() {
    if (!pendingAssign) return;
    if (conflictInfo && conflictInfo.length > 0) {
      toast.error('Please resolve the time conflict before saving');
      return;
    }
    createMutation.mutate({
      patient_id: pendingAssign.patient.id,
      staff_id: pendingAssign.staffMember.id,
      schedule_date: selectedDate,
      time_from: assignForm.time_from,
      time_to: assignForm.time_to,
      service_type: assignForm.service_type,
      notes: assignForm.notes,
      status: 'scheduled',
    });
  }

  function getPatientColor(patientId) {
    const idx = patients.findIndex(p => p.id === patientId);
    return PATIENT_COLORS[idx % PATIENT_COLORS.length];
  }

  function getPatientName(patientId) {
    const p = patients.find(x => x.id === patientId);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-slate-400" />
        Drag patients from the left panel and drop onto a staff member's column to assign them a visit.
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">

          {/* Unscheduled Patients Panel */}
          <div className="flex-shrink-0 w-52">
            <div className="bg-slate-800 text-white rounded-t-lg px-3 py-2 text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Patients
              <span className="ml-auto bg-white/20 rounded-full px-1.5 text-xs">{unscheduledPatients.length}</span>
            </div>
            <Droppable droppableId="unscheduled-patients" isDropDisabled={true}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-slate-100 rounded-b-lg p-2 min-h-[400px] space-y-2"
                >
                  {unscheduledPatients.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      <CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                      All patients scheduled!
                    </div>
                  ) : (
                    unscheduledPatients.map((patient, index) => {
                      const colorClass = getPatientColor(patient.id);
                      return (
                        <Draggable key={patient.id} draggableId={patient.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing shadow-sm select-none transition-shadow ${colorClass} ${snapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : ''}`}
                            >
                              <p className="font-semibold text-xs leading-tight">{patient.first_name} {patient.last_name}</p>
                              {patient.address && (
                                <p className="text-xs mt-0.5 opacity-70 flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  {patient.address}
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Staff Columns */}
          {staff.map((member, colIdx) => {
            const memberSchedules = dateSchedules.filter(s => s.staff_id === member.id);
            const colorClass = STAFF_COLORS[colIdx % STAFF_COLORS.length];
            return (
              <div key={member.id} className="flex-shrink-0 w-52">
                <div className="bg-white border border-slate-200 rounded-t-lg px-3 py-2 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-900 truncate">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-slate-400 truncate">{member.division}</p>
                  </div>
                  <span className="ml-auto bg-slate-100 text-slate-600 rounded-full px-1.5 text-xs flex-shrink-0">{memberSchedules.length}</span>
                </div>
                <Droppable droppableId={`staff-${member.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`border-l-4 rounded-b-lg p-2 min-h-[400px] space-y-2 transition-colors ${colorClass} ${snapshot.isDraggingOver ? 'ring-2 ring-teal-400 ring-offset-1' : ''}`}
                    >
                      {memberSchedules.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-300 rounded-lg m-1">
                          Drop patient here
                        </div>
                      )}
                      {memberSchedules.map((sched) => {
                        const statusColors = {
                          scheduled: 'bg-blue-100 border-blue-300',
                          confirmed: 'bg-emerald-100 border-emerald-300',
                          rescheduled: 'bg-amber-100 border-amber-300',
                        };
                        const colorCls = statusColors[sched.status] || 'bg-white border-slate-200';
                        return (
                          <div key={sched.id} className={`border rounded-lg px-3 py-2 text-xs ${colorCls}`}>
                            <p className="font-semibold text-slate-900 leading-tight truncate">{getPatientName(sched.patient_id)}</p>
                            <div className="flex items-center gap-1 mt-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              {sched.time_from} – {sched.time_to}
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs px-1 py-0">{sched.service_type}</Badge>
                          </div>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Also-scheduled patients (already have shifts today) */}
      {scheduledPatientIds.size > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 font-medium self-center">Already scheduled today:</span>
          {Array.from(scheduledPatientIds).map(pid => (
            <Badge key={pid} variant="outline" className="text-xs">{getPatientName(pid)}</Badge>
          ))}
        </div>
      )}

      {/* Assign Confirmation Dialog */}
      <Dialog open={!!pendingAssign} onOpenChange={() => { setPendingAssign(null); setConflictInfo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Assignment</DialogTitle>
          </DialogHeader>
          {pendingAssign && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-slate-500">Patient:</span> <strong>{pendingAssign.patient.first_name} {pendingAssign.patient.last_name}</strong></p>
                <p><span className="text-slate-500">Staff:</span> <strong>{pendingAssign.staffMember.first_name} {pendingAssign.staffMember.last_name}</strong></p>
                <p><span className="text-slate-500">Date:</span> <strong>{format(parseISO(selectedDate), 'MMM d, yyyy')}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From *</Label>
                  <Input type="time" value={assignForm.time_from}
                    onChange={e => handleTimeChange('time_from', e.target.value)} />
                </div>
                <div>
                  <Label>To *</Label>
                  <Input type="time" value={assignForm.time_to}
                    onChange={e => handleTimeChange('time_to', e.target.value)} />
                </div>
              </div>

              {/* Conflict Warning */}
              {conflictInfo && conflictInfo.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <p className="font-semibold">Double-booking conflict!</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {conflictInfo.map(c => (
                        <li key={c.id}>• {getPatientName(c.patient_id)}: {c.time_from}–{c.time_to}</li>
                      ))}
                    </ul>
                    <p className="text-xs mt-1 opacity-75">Change the time window to avoid overlap.</p>
                  </div>
                </div>
              )}

              <div>
                <Label>Service Type</Label>
                <Select value={assignForm.service_type} onValueChange={v => setAssignForm({...assignForm, service_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={assignForm.notes} onChange={e => setAssignForm({...assignForm, notes: e.target.value})}
                  placeholder="Special instructions..." rows={2} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setPendingAssign(null); setConflictInfo(null); }}>Cancel</Button>
                <Button
                  onClick={handleConfirmAssign}
                  disabled={createMutation.isPending || (conflictInfo && conflictInfo.length > 0)}
                >
                  {createMutation.isPending ? 'Saving...' : 'Confirm Assignment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}