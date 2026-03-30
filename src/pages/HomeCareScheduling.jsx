import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Calendar, Plus, Clock, User, CheckCircle, XCircle, LayoutGrid, List, BarChart2
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useOrganization } from '@/components/OrganizationProvider';
import HomeCareScheduleBoard from '@/components/homecare/HomeCareScheduleBoard';
import HomeCareAnalyticsDashboard from '@/components/homecare/HomeCareAnalyticsDashboard';

export default function HomeCareScheduling() {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewTab, setViewTab] = useState('board');

  const [scheduleForm, setScheduleForm] = useState({
    patient_id: '',
    staff_id: '',
    schedule_date: format(new Date(), 'yyyy-MM-dd'),
    time_from: '08:00',
    time_to: '10:00',
    service_type: 'nursing',
    notes: '',
    status: 'scheduled'
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareStaff'],
    queryFn: () => base44.entities.StaffProfile.filter({ staff_type: 'NURSE', status: 'active' }),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['homeCareSchedules'],
    queryFn: () => base44.entities.HomeCareSchedule.list('-schedule_date'),
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data) => base44.entities.HomeCareSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareSchedules'] });
      setShowAddDialog(false);
      toast.success('Visit scheduled successfully!');
    },
    onError: (error) => toast.error(error.message || 'Failed to schedule visit'),
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.HomeCareSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareSchedules'] });
      toast.success('Schedule updated successfully!');
    }
  });

  const handleSubmit = () => {
    if (!scheduleForm.patient_id || !scheduleForm.staff_id) {
      toast.error('Please select patient and staff');
      return;
    }
    createScheduleMutation.mutate(scheduleForm);
  };

  const getPatientName = (patientId) => {
    const p = patients.find(x => x.id === patientId);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };

  const getStaffName = (staffId) => {
    const s = staff.find(x => x.id === staffId);
    return s ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : 'Unknown';
  };

  const filteredSchedules = schedules.filter(s => s.schedule_date === dateFilter);

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-rose-100 text-rose-700',
    rescheduled: 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Scheduling</h1>
          <p className="text-slate-500 mt-1">Schedule and manage patient visits</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Visit
        </Button>
      </div>

      {/* View Tabs */}
      <Tabs value={viewTab} onValueChange={setViewTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {viewTab !== 'analytics' && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Date:</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-44"
              />
            </div>
          )}
          <TabsList className="sm:ml-auto">
            <TabsTrigger value="board" className="gap-2"><LayoutGrid className="w-4 h-4" />Board</TabsTrigger>
            <TabsTrigger value="list" className="gap-2"><List className="w-4 h-4" />List</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart2 className="w-4 h-4" />Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="mt-4">
          <HomeCareScheduleBoard
            patients={patients}
            staff={staff}
            schedules={schedules}
            selectedDate={dateFilter}
            onScheduleCreated={() => queryClient.invalidateQueries({ queryKey: ['homeCareSchedules'] })}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <HomeCareAnalyticsDashboard schedules={schedules} staff={staff} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
        <div className="space-y-3">
          {filteredSchedules.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No visits scheduled for {format(new Date(dateFilter + 'T00:00:00'), 'MMM d, yyyy')}</p>
            </Card>
          ) : (
            filteredSchedules.map((schedule) => (
              <Card key={schedule.id} className="p-5 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-20 text-center">
                      <Clock className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                      <p className="text-sm font-medium">{schedule.time_from}</p>
                      <p className="text-xs text-slate-500">{schedule.time_to}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <p className="font-semibold text-slate-900">{getPatientName(schedule.patient_id)}</p>
                      </div>
                      <p className="text-sm text-slate-600">Staff: {getStaffName(schedule.staff_id)}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{schedule.service_type}</Badge>
                        <Badge className={statusColors[schedule.status]}>{schedule.status}</Badge>
                      </div>
                      {schedule.notes && <p className="text-xs text-slate-500 mt-2">{schedule.notes}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(schedule.status === 'scheduled' || schedule.status === 'confirmed') ? (
                      <>
                        <Button size="sm" variant="outline" className="text-emerald-600"
                          onClick={() => updateScheduleMutation.mutate({ id: schedule.id, data: { status: 'completed' } })}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Complete
                        </Button>
                        <Button size="sm" variant="outline" className="text-rose-600"
                          onClick={() => updateScheduleMutation.mutate({ id: schedule.id, data: { status: 'cancelled' } })}>
                          <XCircle className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </>
                    ) : (
                      <Badge className={statusColors[schedule.status]}>{schedule.status}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
        </TabsContent>
      </Tabs>

      {/* Add Schedule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule Home Care Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Patient *</Label>
              <Select value={scheduleForm.patient_id} onValueChange={val => setScheduleForm({...scheduleForm, patient_id: val})}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Staff Member (Nurse) *</Label>
              <Select value={scheduleForm.staff_id} onValueChange={val => setScheduleForm({...scheduleForm, staff_id: val})}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={scheduleForm.schedule_date}
                  onChange={e => setScheduleForm({...scheduleForm, schedule_date: e.target.value})} />
              </div>
              <div>
                <Label>From *</Label>
                <Input type="time" value={scheduleForm.time_from}
                  onChange={e => setScheduleForm({...scheduleForm, time_from: e.target.value})} />
              </div>
              <div>
                <Label>To *</Label>
                <Input type="time" value={scheduleForm.time_to}
                  onChange={e => setScheduleForm({...scheduleForm, time_to: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Service Type</Label>
              <Select value={scheduleForm.service_type} onValueChange={val => setScheduleForm({...scheduleForm, service_type: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nursing">Nursing Care</SelectItem>
                  <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                  <SelectItem value="wound_care">Wound Care</SelectItem>
                  <SelectItem value="medication">Medication Administration</SelectItem>
                  <SelectItem value="monitoring">Health Monitoring</SelectItem>
                  <SelectItem value="assistance">Daily Living Assistance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={scheduleForm.notes}
                onChange={e => setScheduleForm({...scheduleForm, notes: e.target.value})}
                placeholder="Special instructions or notes" rows={3} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createScheduleMutation.isPending}>
                {createScheduleMutation.isPending ? 'Scheduling...' : 'Schedule Visit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}