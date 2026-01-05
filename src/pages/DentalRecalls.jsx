import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Phone,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Users
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';

export default function DentalRecalls() {
  const queryClient = useQueryClient();
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showRecallDialog, setShowRecallDialog] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    interval_months: 6,
    appointment_type: 'cleaning'
  });

  const [recallForm, setRecallForm] = useState({
    patient_ref: '',
    rule_ref: '',
    next_due_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['dentalRecallRules'],
    queryFn: () => base44.entities.DentalRecallRule.filter({ active: true }),
  });

  const { data: recalls = [] } = useQuery({
    queryKey: ['dentalRecallEntries'],
    queryFn: () => base44.entities.DentalRecallEntry.list('-next_due_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.DentalRecallRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalRecallRules'] });
      setShowRuleDialog(false);
      setRuleForm({ rule_name: '', interval_months: 6, appointment_type: 'cleaning' });
      toast.success('Recall rule created!');
    },
  });

  const createRecallMutation = useMutation({
    mutationFn: (data) => base44.entities.DentalRecallEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalRecallEntries'] });
      setShowRecallDialog(false);
      toast.success('Recall entry created!');
    },
  });

  const updateRecallStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DentalRecallEntry.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalRecallEntries'] });
      toast.success('Status updated!');
    },
  });

  const getPatientName = (patientRef) => {
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getPatientPhone = (patientRef) => {
    const patient = patients.find(p => p.id === patientRef);
    return patient?.phone || 'N/A';
  };

  const getRuleName = (ruleRef) => {
    const rule = rules.find(r => r.id === ruleRef);
    return rule?.rule_name || 'Unknown';
  };

  const dueRecalls = recalls.filter(r => {
    const dueDate = new Date(r.next_due_date);
    const today = new Date();
    return r.status === 'due' && dueDate <= today;
  });

  const upcomingRecalls = recalls.filter(r => {
    const dueDate = new Date(r.next_due_date);
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    return r.status === 'due' && dueDate > today && dueDate <= weekFromNow;
  });

  const statusColors = {
    due: 'bg-amber-100 text-amber-700',
    booked: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    skipped: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dental Recalls</h1>
          <p className="text-slate-500 mt-1">Patient recall management and call lists</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRuleDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
          <Button onClick={() => setShowRecallDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Recall
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Due Now</p>
            <p className="text-3xl font-bold mt-1">{dueRecalls.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Due This Week</p>
            <p className="text-3xl font-bold mt-1">{upcomingRecalls.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Active</p>
            <p className="text-3xl font-bold mt-1">
              {recalls.filter(r => r.status === 'due' || r.status === 'booked').length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Recall Rules</p>
            <p className="text-3xl font-bold mt-1">{rules.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="due" className="space-y-6">
        <TabsList>
          <TabsTrigger value="due">
            <Phone className="w-4 h-4 mr-2" />
            Due Now ({dueRecalls.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <Calendar className="w-4 h-4 mr-2" />
            This Week ({upcomingRecalls.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Recalls ({recalls.length})
          </TabsTrigger>
          <TabsTrigger value="rules">
            Rules ({rules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="space-y-3">
          {dueRecalls.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
              <p className="text-slate-500 mt-1">No recalls due right now</p>
            </Card>
          ) : (
            dueRecalls.map((recall) => (
              <Card key={recall.id} className="p-5 bg-amber-50 border-amber-200 border-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[recall.status]}>{recall.status}</Badge>
                      <Badge variant="outline">{getRuleName(recall.rule_ref)}</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {getPatientName(recall.patient_ref)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-600">{getPatientPhone(recall.patient_ref)}</p>
                    </div>
                    <p className="text-sm text-amber-700 mt-2">
                      <span className="font-medium">Due:</span> {format(new Date(recall.next_due_date), 'MMM d, yyyy')}
                    </p>
                    {recall.notes && (
                      <p className="text-xs text-slate-600 mt-1">{recall.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateRecallStatusMutation.mutate({ id: recall.id, status: 'booked' })}
                    >
                      Mark Booked
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateRecallStatusMutation.mutate({ id: recall.id, status: 'completed' })}
                    >
                      Complete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {upcomingRecalls.map((recall) => (
            <Card key={recall.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={statusColors[recall.status]}>{recall.status}</Badge>
                    <Badge variant="outline">{getRuleName(recall.rule_ref)}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{getPatientName(recall.patient_ref)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <p className="text-sm text-slate-600">{getPatientPhone(recall.patient_ref)}</p>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    <span className="font-medium">Due:</span> {format(new Date(recall.next_due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {recalls.map((recall) => (
            <Card key={recall.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={statusColors[recall.status]}>{recall.status}</Badge>
                    <Badge variant="outline">{getRuleName(recall.rule_ref)}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{getPatientName(recall.patient_ref)}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">Due:</span> {format(new Date(recall.next_due_date), 'MMM d, yyyy')}
                  </p>
                </div>
                {recall.status === 'due' && (
                  <Select
                    value={recall.status}
                    onValueChange={(val) => updateRecallStatusMutation.mutate({ id: recall.id, status: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due">Due</SelectItem>
                      <SelectItem value="booked">Booked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rules" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <Card key={rule.id} className="p-5">
                <h3 className="font-semibold text-slate-900 mb-2">{rule.rule_name}</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-600">
                    <span className="font-medium">Interval:</span> {rule.interval_months} months
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Type:</span> {rule.appointment_type}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recall Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Rule Name *</Label>
              <Input
                value={ruleForm.rule_name}
                onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                placeholder="e.g., 6-month cleaning, Perio 3 months"
              />
            </div>
            <div>
              <Label>Interval (months) *</Label>
              <Input
                type="number"
                value={ruleForm.interval_months}
                onChange={(e) => setRuleForm({ ...ruleForm, interval_months: parseInt(e.target.value) || 6 })}
              />
            </div>
            <div>
              <Label>Appointment Type *</Label>
              <Input
                value={ruleForm.appointment_type}
                onChange={(e) => setRuleForm({ ...ruleForm, appointment_type: e.target.value })}
                placeholder="e.g., cleaning, checkup"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
              <Button onClick={() => createRuleMutation.mutate(ruleForm)}>
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Recall Dialog */}
      <Dialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recall Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Patient *</Label>
              <Select value={recallForm.patient_ref} onValueChange={(val) => setRecallForm({ ...recallForm, patient_ref: val })}>
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
              <Label>Recall Rule *</Label>
              <Select value={recallForm.rule_ref} onValueChange={(val) => setRecallForm({ ...recallForm, rule_ref: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rule" />
                </SelectTrigger>
                <SelectContent>
                  {rules.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.rule_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next Due Date *</Label>
              <Input
                type="date"
                value={recallForm.next_due_date}
                onChange={(e) => setRecallForm({ ...recallForm, next_due_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRecallDialog(false)}>Cancel</Button>
              <Button onClick={() => createRecallMutation.mutate(recallForm)}>
                Add Recall
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}