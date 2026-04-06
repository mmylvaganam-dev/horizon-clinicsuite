import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle, User, Clock, MapPin, Stethoscope, GripVertical,
  CheckCircle, Pencil, Trash2, X
} from 'lucide-react';
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

function getTimeFromSchedule(sched) {
  if (sched.start_datetime) {
    return sched.start_datetime.split('T')[1]?.slice(0, 5) || '08:00';
  }
  return sched.time_from || '08:00';
}

function getTimeToSchedule(sched) {
  if (sched.end_datetime) {
    return sched.end_datetime.split('T')[1]?.slice(0, 5) || '10:00';
  }
  return sched.time_to || '10:00';
}

function getDateTimeLabel(sched) {
  if (sched.start_datetime) {
    const s = new Date(sched.start_datetime);
    const e = sched.end_datetime ? new Date(sched.end_datetime) : null;
    const sLabel = format(s, 'dd MMM HH:mm');
    const eLabel = e ? format(e, 'dd MMM HH:mm') : '';
    return { from: sLabel, to: eLabel };
  }
  return { from: sched.time_from || '', to: sched.time_to || '' };
}

export default function HomeCareScheduleBoard({ patients, staff, schedules, selectedDate, onScheduleCreated }) {
  const queryClient = useQueryClient();

  // Drag-to-assign new patient
  const [pendingAssign, setPendingAssign] = useState(null);
  const [assignForm, setAssignForm] = useState({ time_from: '08:00', time_to: '10:00', service_type: 'nursing', notes: '' });
  const [conflictInfo, setConflictInfo] = useState(null);

  // Edit existing schedule
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editForm, setEditForm] = useState({});

  const dateSchedules = schedules.filter(s =>
    s.schedule_date === selectedDate && !['cancelled', 'completed'].includes(s.status)
  );

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
      setEditingSchedule(null);
      toast.success('Schedule updated!');
    },
    onError: (e) => toast.error(e.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HomeCareSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareSchedules'] });
      toast.success('Schedule removed');
    },
    onError: (e) => toast.error(e.message || 'Failed to delete'),
  });

  function checkConflicts(staffId, timeFrom, timeTo, excludeScheduleId = null) {
    return dateSchedules.filter(s =>
      s.staff_id === staffId &&
      s.id !== excludeScheduleId &&
      hasTimeOverlap(s.time_from || '00:00', s.time_to || '00:00', timeFrom, timeTo)
    );
  }

  function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const destId = destination.droppableId;

    // Dragging an unscheduled patient onto a staff column
    if (source.droppableId === 'unscheduled-patients' && destId.startsWith('staff-')) {
      const staffId = destId.replace('staff-', '');
      const staffMember = staff.find(s => s.id === staffId);
      const patient = patients.find(p => p.id === draggableId);
      if (!patient || !staffMember) return;
      setPendingAssign({ patient, staffMember });
      setAssignForm({ time_from: '08:00', time_to: '10:00', service_type: 'nursing', notes: '' });
      setConflictInfo(null);
      return;
    }

    // Dragging a scheduled patient card between staff columns (reassign)
    if (source.droppableId.startsWith('staff-') && destId.startsWith('staff-')) {
      const newStaffId = destId.replace('staff-', '');
      // draggableId here is `sched-<id>`
      const schedId = draggableId.replace('sched-', '');
      const sched = dateSchedules.find(s => s.id === schedId);
      if (!sched || sched.staff_id === newStaffId) return;
      updateMutation.mutate({ id: schedId, data: { staff_id: newStaffId } });
    }
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
      start_datetime: `${selectedDate}T${assignForm.time_from}`,
      end_datetime: `${selectedDate}T${assignForm.time_to}`,
      service_type: assignForm.service_type,
      notes: assignForm.notes,
      status: 'scheduled',
    });
  }

  function openEdit(sched) {
    setEditingSchedule(sched);
    setEditForm({
      time_from: getTimeFromSchedule(sched),
      time_to: getTimeToSchedule(sched),
      start_datetime: sched.start_datetime || `${sched.schedule_date}T${sched.time_from || '08:00'}`,
      end_datetime: sched.end_datetime || `${sched.schedule_date}T${sched.time_to || '10:00'}`,
      service_type: sched.service_type || 'nursing',
      notes: sched.notes || '',
      status: sched.status || 'scheduled',
    });
  }

  function handleSaveEdit() {
    if (!editingSchedule) return;
    const startDate = editForm.start_datetime?.split('T')[0] || editingSchedule.schedule_date;
    const startTime = editForm.start_datetime?.split('T')[1]?.slice(0, 5) || editForm.time_from;
    const endTime = editForm.end_datetime?.split('T')[1]?.slice(0, 5) || editForm.time_to;
    updateMutation.mutate({
      id: editingSchedule.id,
      data: {
        ...editForm,
        schedule_date: startDate,
        time_from: startTime,
        time_to: endTime,
      },
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

  const statusBorderColors = {
    scheduled: 'bg-blue-50 border-blue-300',
    confirmed: 'bg-emerald-50 border-emerald-300',
    rescheduled: 'bg-amber-50 border-amber-300',
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-slate-400" />
        Drag patients onto a staff column to assign. Drag cards between staff columns to reassign. Click ✏️ to edit or 🗑️ to remove.
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
              <div key={member.id} className="flex-shrink-0 w-56">
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
                      {memberSchedules.map((sched, idx) => {
                        const timeLabel = getDateTimeLabel(sched);
                        const colorCls = statusBorderColors[sched.status] || 'bg-white border-slate-200';
                        return (
                          <Draggable key={sched.id} draggableId={`sched-${sched.id}`} index={idx}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className={`border rounded-lg px-3 py-2 text-xs ${colorCls} ${snap.isDragging ? 'shadow-lg scale-105 rotate-1' : ''}`}
                              >
                                {/* Drag handle row */}
                                <div className="flex items-center justify-between mb-1">
                                  <div {...prov.dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-black/5">
                                    <GripVertical className="w-3 h-3 text-slate-400" />
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEdit(sched)}
                                      className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => { if (window.confirm('Remove this schedule?')) deleteMutation.mutate(sched.id); }}
                                      className="text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="font-semibold text-slate-900 leading-tight truncate">{getPatientName(sched.patient_id)}</p>
                                <div className="flex items-center gap-1 mt-1 text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{timeLabel.from}</span>
                                  {timeLabel.to && <span className="text-slate-400"> → {timeLabel.to}</span>}
                                </div>
                                <Badge variant="outline" className="mt-1 text-xs px-1 py-0">{sched.service_type}</Badge>
                              </div>
                            )}
                          </Draggable>
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

      {/* Already-scheduled summary */}
      {scheduledPatientIds.size > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 font-medium self-center">Scheduled today:</span>
          {Array.from(scheduledPatientIds).map(pid => (
            <Badge key={pid} variant="outline" className="text-xs">{getPatientName(pid)}</Badge>
          ))}
        </div>
      )}

      {/* Assign Dialog (drag-to-create) */}
      <Dialog open={!!pendingAssign} onOpenChange={() => { setPendingAssign(null); setConflictInfo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirm Assignment</DialogTitle></DialogHeader>
          {pendingAssign && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-slate-500">Patient:</span> <strong>{pendingAssign.patient.first_name} {pendingAssign.patient.last_name}</strong></p>
                <p><span className="text-slate-500">Staff:</span> <strong>{pendingAssign.staffMember.first_name} {pendingAssign.staffMember.last_name}</strong></p>
                <p><span className="text-slate-500">Date:</span> <strong>{format(parseISO(selectedDate), 'MMM d, yyyy')}</strong></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Shift Start *</Label>
                  <Input type="datetime-local"
                    value={`${selectedDate}T${assignForm.time_from}`}
                    onChange={e => {
                      const t = e.target.value.split('T')[1]?.slice(0,5) || '08:00';
                      handleTimeChange('time_from', t);
                    }} />
                </div>
                <div>
                  <Label>Shift End *</Label>
                  <Input type="datetime-local"
                    value={`${selectedDate}T${assignForm.time_to}`}
                    onChange={e => {
                      const t = e.target.value.split('T')[1]?.slice(0,5) || '10:00';
                      handleTimeChange('time_to', t);
                    }} />
                </div>
              </div>
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
                  </div>
                </div>
              )}
              <div>
                <Label>Service Type</Label>
                <Select value={assignForm.service_type} onValueChange={v => setAssignForm({...assignForm, service_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
                <Button onClick={handleConfirmAssign} disabled={createMutation.isPending || (conflictInfo && conflictInfo.length > 0)}>
                  {createMutation.isPending ? 'Saving...' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editingSchedule} onOpenChange={() => setEditingSchedule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Schedule</DialogTitle></DialogHeader>
          {editingSchedule && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-slate-500">Patient:</span> <strong>{getPatientName(editingSchedule.patient_id)}</strong></p>
                <p><span className="text-slate-500">Staff:</span> <strong>{staff.find(s => s.id === editingSchedule.staff_id)?.first_name} {staff.find(s => s.id === editingSchedule.staff_id)?.last_name}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Shift Start *</Label>
                  <Input type="datetime-local" value={editForm.start_datetime || ''}
                    onChange={e => setEditForm({...editForm, start_datetime: e.target.value, time_from: e.target.value.split('T')[1]?.slice(0,5) || editForm.time_from})} />
                </div>
                <div>
                  <Label>Shift End *</Label>
                  <Input type="datetime-local" value={editForm.end_datetime || ''}
                    onChange={e => setEditForm({...editForm, end_datetime: e.target.value, time_to: e.target.value.split('T')[1]?.slice(0,5) || editForm.time_to})} />
                </div>
              </div>

              <div>
                <Label>Reassign Staff</Label>
                <Select value={editingSchedule.staff_id} onValueChange={v => setEditingSchedule({...editingSchedule, staff_id: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.division}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Service Type</Label>
                <Select value={editForm.service_type} onValueChange={v => setEditForm({...editForm, service_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  placeholder="Special instructions..." rows={2} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditingSchedule(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}