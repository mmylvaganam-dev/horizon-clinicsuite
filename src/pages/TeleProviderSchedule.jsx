import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Calendar, Clock, Plus, Trash2, Edit2, CheckCircle,
  AlertCircle, User, CalendarOff, Info
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { formatDateStr } from '@/lib/teleAvailability';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_DURATIONS = [15, 20, 30, 45, 60];

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function TeleProviderSchedule() {
  const qc = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true });
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState(null);
  const [timeOffForm, setTimeOffForm] = useState({ date_from: '', date_to: '', reason: '', is_partial_day: false, blocked_from: '', blocked_to: '' });

  // Providers list
  const { data: providers = [] } = useQuery({
    queryKey: ['teleProvidersAll'],
    queryFn: () => base44.entities.TeleProvider.filter({ is_active: true }),
  });

  // Auto-select first provider
  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId]);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  // Availability slots for selected provider
  const { data: availability = [], isLoading: loadingAvail } = useQuery({
    queryKey: ['teleAvailability', selectedProviderId],
    queryFn: () => base44.entities.TeleProviderAvailability.filter({ provider_id: selectedProviderId }),
    enabled: !!selectedProviderId,
  });

  // Time-off records
  const { data: timeOff = [], isLoading: loadingTimeOff } = useQuery({
    queryKey: ['teleTimeOff', selectedProviderId],
    queryFn: () => base44.entities.TeleProviderTimeOff.filter({ provider_id: selectedProviderId }),
    enabled: !!selectedProviderId,
  });

  // Upcoming bookings for this provider (next 14 days preview)
  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ['teleBookingsPreview', selectedProviderId],
    queryFn: () => base44.entities.TeleAppointment.filter({ provider_id: selectedProviderId }),
    enabled: !!selectedProviderId,
  });

  // ── Availability mutations ─────────────────────────────────────────────────
  const saveSlot = useMutation({
    mutationFn: async (data) => {
      if (editingSlot?.id) {
        return base44.entities.TeleProviderAvailability.update(editingSlot.id, data);
      }
      return base44.entities.TeleProviderAvailability.create({ ...data, provider_id: selectedProviderId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleAvailability', selectedProviderId] });
      toast.success('Availability saved');
      setShowSlotDialog(false);
      setEditingSlot(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteSlot = useMutation({
    mutationFn: (id) => base44.entities.TeleProviderAvailability.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleAvailability', selectedProviderId] });
      toast.success('Slot removed');
    },
  });

  const toggleSlot = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.TeleProviderAvailability.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teleAvailability', selectedProviderId] }),
  });

  // ── Time-off mutations ─────────────────────────────────────────────────────
  const saveTimeOff = useMutation({
    mutationFn: async (data) => {
      if (editingTimeOff?.id) {
        return base44.entities.TeleProviderTimeOff.update(editingTimeOff.id, data);
      }
      return base44.entities.TeleProviderTimeOff.create({ ...data, provider_id: selectedProviderId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleTimeOff', selectedProviderId] });
      toast.success('Time-off saved');
      setShowTimeOffDialog(false);
      setEditingTimeOff(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteTimeOff = useMutation({
    mutationFn: (id) => base44.entities.TeleProviderTimeOff.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teleTimeOff', selectedProviderId] }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openNewSlot = () => {
    setEditingSlot(null);
    setSlotForm({ day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true });
    setShowSlotDialog(true);
  };

  const openEditSlot = (slot) => {
    setEditingSlot(slot);
    setSlotForm({ ...slot });
    setShowSlotDialog(true);
  };

  const openNewTimeOff = () => {
    setEditingTimeOff(null);
    const today = formatDateStr(new Date());
    setTimeOffForm({ date_from: today, date_to: today, reason: '', is_partial_day: false, blocked_from: '', blocked_to: '' });
    setShowTimeOffDialog(true);
  };

  const openEditTimeOff = (t) => {
    setEditingTimeOff(t);
    setTimeOffForm({ ...t });
    setShowTimeOffDialog(true);
  };

  // Compute weekly slot summary
  const slotsByDay = DAYS.map((day, i) => ({
    day,
    dayIndex: i,
    slots: availability.filter(a => a.day_of_week === i),
  }));

  // Upcoming time-off (not in the past)
  const todayStr = formatDateStr(new Date());
  const futureTimeOff = timeOff.filter(t => t.date_to >= todayStr).sort((a, b) => a.date_from.localeCompare(b.date_from));
  const pastTimeOff = timeOff.filter(t => t.date_to < todayStr).sort((a, b) => b.date_from.localeCompare(a.date_from));

  // 14-day preview of available days
  const preview = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    const dayOfWeek = d.getDay();
    const dateStr = formatDateStr(d);
    const hasSchedule = availability.some(a => a.day_of_week === dayOfWeek && a.is_active !== false);
    const isBlocked = timeOff.some(t => t.date_from <= dateStr && t.date_to >= dateStr && !t.is_partial_day);
    const isPartialBlock = timeOff.some(t => t.date_from <= dateStr && t.date_to >= dateStr && t.is_partial_day);
    const dayBookings = upcomingBookings.filter(b => {
      if (!b.scheduled_time) return false;
      const bd = new Date(b.scheduled_time);
      return formatDateStr(bd) === dateStr && ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status);
    });
    return { date: d, dateStr, dayOfWeek, hasSchedule, isBlocked, isPartialBlock, bookingCount: dayBookings.length };
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-teal-600" />
          Provider Availability Management
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Set weekly consultation hours and block time off. Changes reflect immediately in patient booking.
        </p>
      </div>

      {/* Provider Selector */}
      <Card>
        <CardContent className="py-4 flex items-center gap-4 flex-wrap">
          <User className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <Label className="text-sm font-medium text-slate-700 flex-shrink-0">Managing schedule for:</Label>
          <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select provider..." />
            </SelectTrigger>
            <SelectContent>
              {providers.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {p.specialty || 'General'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProvider && (
            <Badge className={selectedProvider.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
              {selectedProvider.verification_status}
            </Badge>
          )}
        </CardContent>
      </Card>

      {!selectedProviderId && (
        <div className="text-center py-16 text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a provider above to manage their schedule.</p>
        </div>
      )}

      {selectedProviderId && (
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly" className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Weekly Hours
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="flex items-center gap-1.5">
              <CalendarOff className="w-4 h-4" /> Time Off
              {futureTimeOff.length > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {futureTimeOff.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> 14-Day Preview
            </TabsTrigger>
          </TabsList>

          {/* ── Weekly Hours Tab ────────────────────────────────────────────── */}
          <TabsContent value="weekly" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Define which days and hours this provider is available for consultations.
              </p>
              <Button onClick={openNewSlot} size="sm" className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-1" /> Add Slot
              </Button>
            </div>

            {loadingAvail ? (
              <p className="text-slate-400 text-sm text-center py-8">Loading...</p>
            ) : (
              <div className="grid gap-3">
                {slotsByDay.map(({ day, dayIndex, slots: daySlots }) => (
                  <Card key={dayIndex} className={`border ${daySlots.length === 0 ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200'}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-28 flex-shrink-0">
                          <p className={`font-semibold text-sm ${daySlots.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{day}</p>
                        </div>
                        {daySlots.length === 0 ? (
                          <p className="text-xs text-slate-400 italic flex-1">Not available</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 flex-1">
                            {daySlots.map(slot => (
                              <div key={slot.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${slot.is_active !== false ? 'bg-teal-50 border-teal-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                                <Clock className="w-3 h-3 text-teal-600" />
                                <span className="font-medium">{slot.start_time} – {slot.end_time}</span>
                                <span className="text-slate-400">({slot.slot_duration_minutes || 30}min slots)</span>
                                <Switch
                                  checked={slot.is_active !== false}
                                  onCheckedChange={v => toggleSlot.mutate({ id: slot.id, is_active: v })}
                                  className="scale-75"
                                />
                                <button onClick={() => openEditSlot(slot)} className="text-slate-400 hover:text-teal-600">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => deleteSlot.mutate(slot.id)} className="text-slate-400 hover:text-red-500">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-teal-600 hover:text-teal-700 flex-shrink-0"
                          onClick={() => {
                            setEditingSlot(null);
                            setSlotForm({ day_of_week: dayIndex, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, is_active: true });
                            setShowSlotDialog(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-0.5" /> Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 text-xs text-slate-400 mt-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Slots are generated automatically from the time window. E.g. 9:00–12:00 with 30-min slots = 9:00, 9:30, 10:00, 10:30, 11:00, 11:30.</span>
            </div>
          </TabsContent>

          {/* ── Time Off Tab ────────────────────────────────────────────────── */}
          <TabsContent value="timeoff" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Block specific dates or partial hours (holidays, leave, conferences).</p>
              <Button onClick={openNewTimeOff} size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-1" /> Add Time Off
              </Button>
            </div>

            {loadingTimeOff ? (
              <p className="text-slate-400 text-sm text-center py-8">Loading...</p>
            ) : futureTimeOff.length === 0 && pastTimeOff.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-slate-400">
                  <CalendarOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No time-off blocks. Provider is available on all scheduled days.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {futureTimeOff.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Upcoming</p>
                    <div className="space-y-2">
                      {futureTimeOff.map(t => (
                        <TimeOffRow key={t.id} t={t} onEdit={openEditTimeOff} onDelete={id => deleteTimeOff.mutate(id)} />
                      ))}
                    </div>
                  </div>
                )}
                {pastTimeOff.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4">Past</p>
                    <div className="space-y-2 opacity-60">
                      {pastTimeOff.slice(0, 5).map(t => (
                        <TimeOffRow key={t.id} t={t} onEdit={openEditTimeOff} onDelete={id => deleteTimeOff.mutate(id)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── 14-Day Preview Tab ──────────────────────────────────────────── */}
          <TabsContent value="preview" className="mt-4">
            <p className="text-sm text-slate-500 mb-4">
              Live view of patient-facing availability for the next 14 days based on schedule + time-off.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {preview.map(({ date, hasSchedule, isBlocked, isPartialBlock, bookingCount }) => {
                const available = hasSchedule && !isBlocked;
                return (
                  <div
                    key={formatDateStr(date)}
                    className={`rounded-xl border p-3 text-center text-xs transition-colors ${
                      isBlocked ? 'bg-red-50 border-red-200' :
                      !hasSchedule ? 'bg-slate-50 border-slate-200' :
                      isPartialBlock ? 'bg-orange-50 border-orange-200' :
                      'bg-teal-50 border-teal-200'
                    }`}
                  >
                    <p className="font-semibold text-slate-600">{format(date, 'EEE')}</p>
                    <p className="text-lg font-bold text-slate-800">{format(date, 'd')}</p>
                    <p className="text-slate-400">{format(date, 'MMM')}</p>
                    <div className="mt-1">
                      {isBlocked ? (
                        <span className="text-red-500 font-medium">Off</span>
                      ) : !hasSchedule ? (
                        <span className="text-slate-400">—</span>
                      ) : isPartialBlock ? (
                        <span className="text-orange-600 font-medium">Partial</span>
                      ) : (
                        <span className="text-teal-600 font-medium">Open</span>
                      )}
                    </div>
                    {bookingCount > 0 && (
                      <div className="mt-1">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs">
                          {bookingCount} booked
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-200 inline-block" /> Available</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Partial block</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Time off</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Not scheduled</span>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Add/Edit Slot Dialog ────────────────────────────────────────────── */}
      <Dialog open={showSlotDialog} onOpenChange={v => { if (!v) { setShowSlotDialog(false); setEditingSlot(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlot ? 'Edit Availability Slot' : 'Add Availability Slot'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Day of Week</Label>
              <Select value={String(slotForm.day_of_week)} onValueChange={v => setSlotForm(p => ({ ...p, day_of_week: Number(v) }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Time</Label>
                <Select value={slotForm.start_time} onValueChange={v => setSlotForm(p => ({ ...p, start_time: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Select value={slotForm.end_time} onValueChange={v => setSlotForm(p => ({ ...p, end_time: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Slot Duration (minutes)</Label>
              <Select value={String(slotForm.slot_duration_minutes)} onValueChange={v => setSlotForm(p => ({ ...p, slot_duration_minutes: Number(v) }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOT_DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">
                {slotForm.start_time && slotForm.end_time && slotForm.slot_duration_minutes ? (() => {
                  const [sh, sm] = slotForm.start_time.split(':').map(Number);
                  const [eh, em] = slotForm.end_time.split(':').map(Number);
                  const totalMins = (eh * 60 + em) - (sh * 60 + sm);
                  const count = Math.floor(totalMins / slotForm.slot_duration_minutes);
                  return count > 0 ? `${count} slots will be generated` : 'Invalid time range';
                })() : ''}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active (visible to patients)</Label>
              <Switch checked={!!slotForm.is_active} onCheckedChange={v => setSlotForm(p => ({ ...p, is_active: v }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowSlotDialog(false); setEditingSlot(null); }}>Cancel</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => saveSlot.mutate(slotForm)} disabled={saveSlot.isPending}>
                {saveSlot.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Time Off Dialog ────────────────────────────────────────── */}
      <Dialog open={showTimeOffDialog} onOpenChange={v => { if (!v) { setShowTimeOffDialog(false); setEditingTimeOff(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-orange-500" />
              {editingTimeOff ? 'Edit Time Off' : 'Add Time Off / Block'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Date *</Label>
                <Input type="date" value={timeOffForm.date_from} onChange={e => setTimeOffForm(p => ({ ...p, date_from: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">To Date *</Label>
                <Input type="date" value={timeOffForm.date_to} onChange={e => setTimeOffForm(p => ({ ...p, date_to: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Input value={timeOffForm.reason || ''} onChange={e => setTimeOffForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Leave, Conference, Public Holiday" className="mt-1" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Partial day block only</Label>
                <p className="text-xs text-slate-400">Only block specific hours, not the whole day</p>
              </div>
              <Switch checked={!!timeOffForm.is_partial_day} onCheckedChange={v => setTimeOffForm(p => ({ ...p, is_partial_day: v }))} />
            </div>
            {timeOffForm.is_partial_day && (
              <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-orange-200">
                <div>
                  <Label className="text-xs">Block From</Label>
                  <Select value={timeOffForm.blocked_from || ''} onValueChange={v => setTimeOffForm(p => ({ ...p, blocked_from: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Start" /></SelectTrigger>
                    <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Block To</Label>
                  <Select value={timeOffForm.blocked_to || ''} onValueChange={v => setTimeOffForm(p => ({ ...p, blocked_to: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="End" /></SelectTrigger>
                    <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowTimeOffDialog(false); setEditingTimeOff(null); }}>Cancel</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => saveTimeOff.mutate(timeOffForm)} disabled={saveTimeOff.isPending || !timeOffForm.date_from || !timeOffForm.date_to}>
                {saveTimeOff.isPending ? 'Saving...' : 'Save Time Off'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimeOffRow({ t, onEdit, onDelete }) {
  const todayStr = formatDateStr(new Date());
  const isPast = t.date_to < todayStr;
  return (
    <Card className="border-orange-100">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <CalendarOff className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">
            {t.date_from === t.date_to ? t.date_from : `${t.date_from} → ${t.date_to}`}
          </p>
          <p className="text-xs text-slate-500">
            {t.reason || 'No reason given'}
            {t.is_partial_day && t.blocked_from && ` · ${t.blocked_from}–${t.blocked_to} blocked`}
          </p>
        </div>
        {t.is_partial_day && <Badge className="bg-orange-100 text-orange-700 text-xs border-0">Partial</Badge>}
        {!isPast && (
          <div className="flex gap-1">
            <button onClick={() => onEdit(t)} className="text-slate-400 hover:text-teal-600 p-1">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(t.id)} className="text-slate-400 hover:text-red-500 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}