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
import { 
  Plus, 
  Users, 
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Printer,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function HomeCareBatchManagement() {
  const queryClient = useQueryClient();
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [showCaretakerDialog, setShowCaretakerDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  const [batchForm, setBatchForm] = useState({
    batch_date: format(new Date(), 'yyyy-MM-dd'),
    batch_notes: '',
    escalation_contact_name: '',
    escalation_contact_phone: '',
    shift_log_ref: ''
  });

  const [caseForm, setCaseForm] = useState({
    patient_ref: '',
    patient_name_cache: '',
    patient_age_cache: '',
    service_address_text: '',
    time_window_start: '',
    time_window_end: '',
    notes: ''
  });

  const [caretakerForm, setCaretakerForm] = useState({
    caretaker_name: '',
    caretaker_phone: '',
    caretaker_age: '',
    experience_notes: '',
    notes: ''
  });

  const [contactForm, setContactForm] = useState({
    target: 'caretaker',
    result: 'no_answer',
    notes: ''
  });

  const [assignForm, setAssignForm] = useState({
    caretaker_ref: '',
    caretaker_name_cache: '',
    caretaker_phone_cache: ''
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['homeCareBatches'],
    queryFn: () => base44.entities.HomeCareBatch.list('-batch_date'),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['homeCareCases'],
    queryFn: () => base44.entities.HomeCareCase.list(),
  });

  const { data: caretakers = [] } = useQuery({
    queryKey: ['caretakers'],
    queryFn: () => base44.entities.CaretakerProfileLight.filter({ active: true }),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['homeCareAssignments'],
    queryFn: () => base44.entities.HomeCareAssignment.list('-created_at'),
  });

  const { data: contactAttempts = [] } = useQuery({
    queryKey: ['contactAttempts'],
    queryFn: () => base44.entities.HomeCareContactAttempt.list('-attempt_datetime'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: shiftLogs = [] } = useQuery({
    queryKey: ['shiftLogs'],
    queryFn: () => base44.entities.ShiftLog.list('-shift_date'),
  });

  const createBatchMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareBatch.create(data),
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ['homeCareBatches'] });
      setShowBatchDialog(false);
      setSelectedBatch(batch);
      toast.success('Batch created!');
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareCase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareCases'] });
      setShowCaseDialog(false);
      setCaseForm({
        patient_ref: '',
        patient_name_cache: '',
        patient_age_cache: '',
        service_address_text: '',
        time_window_start: '',
        time_window_end: '',
        notes: ''
      });
      toast.success('Case added!');
    },
  });

  const createCaretakerMutation = useMutation({
    mutationFn: (data) => base44.entities.CaretakerProfileLight.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caretakers'] });
      setShowCaretakerDialog(false);
      setCaretakerForm({
        caretaker_name: '',
        caretaker_phone: '',
        caretaker_age: '',
        experience_notes: '',
        notes: ''
      });
      toast.success('Caretaker added!');
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareAssignments'] });
      setShowAssignDialog(false);
      toast.success('Caretaker assigned!');
    },
  });

  const createContactAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareContactAttempt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactAttempts'] });
      setShowContactDialog(false);
      setContactForm({ target: 'caretaker', result: 'no_answer', notes: '' });
      toast.success('Contact attempt logged!');
    },
  });

  const updateCaseStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.HomeCareCase.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareCases'] });
      toast.success('Status updated!');
    },
  });

  const pushToShiftLogMutation = useMutation({
    mutationFn: async (batchId) => {
      const batch = batches.find(b => b.id === batchId);
      const batchCases = cases.filter(c => c.homecare_batch_ref === batchId);

      if (!batch.shift_log_ref) {
        throw new Error('No shift log linked to this batch');
      }

      for (const c of batchCases) {
        const assignment = assignments.find(a => a.homecare_case_ref === c.id);
        const itemText = `${c.patient_name_cache} (${c.patient_age_cache}y) - ${c.service_address_text} - ${c.time_window_start || 'TBD'} to ${c.time_window_end || 'TBD'} - Caretaker: ${assignment?.caretaker_name_cache || 'Not assigned'}`;

        await base44.entities.ShiftLogItem.create({
          shift_log_ref: batch.shift_log_ref,
          section_code: 'HOMECARE',
          item_text: itemText,
          priority: 'high',
          status: c.status === 'completed' ? 'done' : 'open',
          patient_ref: c.patient_ref,
          patient_name_cache: c.patient_name_cache,
          related_ref_type: 'HomeCareCase',
          related_ref_id: c.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLogItems'] });
      toast.success('Pushed to Shift Log!');
    },
  });

  const generatePDF = (batch) => {
    const doc = new jsPDF();
    const batchCases = cases.filter(c => c.homecare_batch_ref === batch.id);

    doc.setFontSize(18);
    doc.text('HOME CARE BATCH ASSIGNMENT', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(batch.batch_date), 'dd MMM yyyy')}`, 20, 30);
    doc.text(`Status: ${batch.status.toUpperCase()}`, 20, 36);
    
    if (batch.escalation_contact_name) {
      doc.text(`Escalation Contact: ${batch.escalation_contact_name} (${batch.escalation_contact_phone || 'N/A'})`, 20, 42);
    }

    if (batch.batch_notes) {
      doc.setFontSize(9);
      doc.text(`Notes: ${batch.batch_notes}`, 20, 50);
    }

    let y = 60;
    doc.setFontSize(12);
    doc.text('PATIENT ASSIGNMENTS', 20, y);
    y += 10;

    batchCases.forEach((c, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const assignment = assignments.find(a => a.homecare_case_ref === c.id);
      const attempts = contactAttempts.filter(a => a.homecare_case_ref === c.id);
      const lastAttempt = attempts[0];

      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${c.patient_name_cache} (${c.patient_age_cache || 'N/A'}y)`, 20, y);
      y += 6;

      doc.setFontSize(9);
      doc.text(`Address: ${c.service_address_text}`, 25, y);
      y += 5;
      doc.text(`Time: ${c.time_window_start || 'TBD'} - ${c.time_window_end || 'TBD'}`, 25, y);
      y += 5;
      doc.text(`Status: ${c.status}`, 25, y);
      y += 5;

      if (assignment) {
        doc.text(`Caretaker: ${assignment.caretaker_name_cache} (${assignment.caretaker_phone_cache || 'N/A'}) - ${assignment.assignment_status}`, 25, y);
        y += 5;
      } else {
        doc.text('Caretaker: NOT ASSIGNED', 25, y);
        y += 5;
      }

      if (lastAttempt) {
        doc.text(`Last Contact: ${lastAttempt.target} - ${lastAttempt.result} (${format(new Date(lastAttempt.attempt_datetime), 'dd MMM HH:mm')})`, 25, y);
        y += 5;
      }

      y += 3;
    });

    doc.save(`homecare_batch_${batch.batch_date}.pdf`);
    toast.success('PDF generated!');
  };

  const statusColors = {
    new: 'bg-slate-100 text-slate-700',
    attempting_contact: 'bg-blue-100 text-blue-700',
    assigned: 'bg-amber-100 text-amber-700',
    scheduled: 'bg-purple-100 text-purple-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Batch Management</h1>
          <p className="text-slate-500 mt-1">Manage caretaker arrangements and patient cases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCaretakerDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Caretaker
          </Button>
          <Button onClick={() => setShowBatchDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Batch
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {batches.map((batch) => {
              const batchCases = cases.filter(c => c.homecare_batch_ref === batch.id);
              const completedCases = batchCases.filter(c => c.status === 'completed').length;

              return (
                <Card
                  key={batch.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                    selectedBatch?.id === batch.id ? 'border-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedBatch(batch)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(batch.batch_date), 'dd MMM yyyy')}
                      </p>
                      <p className="text-sm text-slate-500">{batchCases.length} cases</p>
                    </div>
                    <Badge variant="outline">{batch.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p>{completedCases}/{batchCases.length} completed</p>
                    {batch.escalation_contact_name && (
                      <p className="mt-1">Escalation: {batch.escalation_contact_name}</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Batch Details */}
        <Card className="lg:col-span-2">
          {!selectedBatch ? (
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Select a batch to view details</p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Batch - {format(new Date(selectedBatch.batch_date), 'dd MMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePDF(selectedBatch)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print A4
                    </Button>
                    {selectedBatch.shift_log_ref && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pushToShiftLogMutation.mutate(selectedBatch.id)}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Push to Shift Log
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setShowCaseDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Case
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedBatch.batch_notes && (
                  <Card className="bg-amber-50">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-amber-900 mb-1">Batch Notes</p>
                      <p className="text-sm text-amber-800">{selectedBatch.batch_notes}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedBatch.escalation_contact_name && (
                  <Card className="bg-blue-50">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Escalation Contact</p>
                      <p className="text-sm text-blue-800">
                        {selectedBatch.escalation_contact_name} - {selectedBatch.escalation_contact_phone}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {cases
                    .filter(c => c.homecare_batch_ref === selectedBatch.id)
                    .map((c) => {
                      const assignment = assignments.find(a => a.homecare_case_ref === c.id);
                      const attempts = contactAttempts.filter(a => a.homecare_case_ref === c.id);
                      const lastAttempt = attempts[0];

                      return (
                        <Card key={c.id} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-slate-900">
                                  {c.patient_name_cache} ({c.patient_age_cache || 'N/A'}y)
                                </h4>
                                <Badge className={statusColors[c.status]}>{c.status}</Badge>
                              </div>
                              <div className="space-y-1 text-sm text-slate-600">
                                <p className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {c.service_address_text}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {c.time_window_start || 'TBD'} - {c.time_window_end || 'TBD'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {assignment ? (
                            <Card className="bg-emerald-50 p-3 mb-3">
                              <p className="text-sm font-semibold text-emerald-900 mb-1">Assigned Caretaker</p>
                              <p className="text-sm text-emerald-800">
                                {assignment.caretaker_name_cache} - {assignment.caretaker_phone_cache || 'N/A'}
                              </p>
                              <Badge className="mt-1 text-xs">{assignment.assignment_status}</Badge>
                            </Card>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCase(c);
                                setShowAssignDialog(true);
                              }}
                            >
                              Assign Caretaker
                            </Button>
                          )}

                          {lastAttempt && (
                            <Card className="bg-slate-50 p-3 mb-3">
                              <p className="text-xs text-slate-600">
                                Last Contact: {lastAttempt.target} - <strong>{lastAttempt.result}</strong>
                                <br />
                                {format(new Date(lastAttempt.attempt_datetime), 'dd MMM HH:mm')}
                                {lastAttempt.notes && ` - ${lastAttempt.notes}`}
                              </p>
                            </Card>
                          )}

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCase(c);
                                setShowContactDialog(true);
                              }}
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Log Contact
                            </Button>
                            {c.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCaseStatusMutation.mutate({ id: c.id, status: 'completed' })}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Create Batch Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Home Care Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Batch Date *</Label>
              <Input
                type="date"
                value={batchForm.batch_date}
                onChange={(e) => setBatchForm({ ...batchForm, batch_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Link to Shift Log (Optional)</Label>
              <Select
                value={batchForm.shift_log_ref}
                onValueChange={(val) => setBatchForm({ ...batchForm, shift_log_ref: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift log" />
                </SelectTrigger>
                <SelectContent>
                  {shiftLogs.map(log => (
                    <SelectItem key={log.id} value={log.id}>
                      {log.shift_name} - {format(new Date(log.shift_date), 'dd MMM yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Batch Notes</Label>
              <Textarea
                value={batchForm.batch_notes}
                onChange={(e) => setBatchForm({ ...batchForm, batch_notes: e.target.value })}
                placeholder="e.g., Caretaker arrangement required for three patients"
                rows={3}
              />
            </div>

            <div>
              <Label>Escalation Contact Name</Label>
              <Input
                value={batchForm.escalation_contact_name}
                onChange={(e) => setBatchForm({ ...batchForm, escalation_contact_name: e.target.value })}
                placeholder="e.g., Shayoutthan"
              />
            </div>

            <div>
              <Label>Escalation Contact Phone</Label>
              <Input
                value={batchForm.escalation_contact_phone}
                onChange={(e) => setBatchForm({ ...batchForm, escalation_contact_phone: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createBatchMutation.mutate(batchForm);
                }}
              >
                Create Batch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Case Dialog */}
      <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Home Care Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Link to EMR Patient (Optional)</Label>
              <Select
                value={caseForm.patient_ref}
                onValueChange={(val) => {
                  const patient = patients.find(p => p.id === val);
                  setCaseForm({
                    ...caseForm,
                    patient_ref: val,
                    patient_name_cache: patient ? `${patient.first_name} ${patient.last_name}` : '',
                    patient_age_cache: patient ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : ''
                  });
                }}
              >
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
              <Label>Patient Name *</Label>
              <Input
                value={caseForm.patient_name_cache}
                onChange={(e) => setCaseForm({ ...caseForm, patient_name_cache: e.target.value })}
              />
            </div>

            <div>
              <Label>Patient Age</Label>
              <Input
                type="number"
                value={caseForm.patient_age_cache}
                onChange={(e) => setCaseForm({ ...caseForm, patient_age_cache: e.target.value })}
              />
            </div>

            <div>
              <Label>Service Address *</Label>
              <Textarea
                value={caseForm.service_address_text}
                onChange={(e) => setCaseForm({ ...caseForm, service_address_text: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Time Window Start</Label>
                <Input
                  type="time"
                  value={caseForm.time_window_start}
                  onChange={(e) => setCaseForm({ ...caseForm, time_window_start: e.target.value })}
                />
              </div>
              <div>
                <Label>Time Window End</Label>
                <Input
                  type="time"
                  value={caseForm.time_window_end}
                  onChange={(e) => setCaseForm({ ...caseForm, time_window_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={caseForm.notes}
                onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCaseDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedBatch) {
                    toast.error('Please select a batch first');
                    return;
                  }
                  createCaseMutation.mutate({
                    ...caseForm,
                    homecare_batch_ref: selectedBatch.id
                  });
                }}
              >
                Add Case
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Caretaker Dialog */}
      <Dialog open={showCaretakerDialog} onOpenChange={setShowCaretakerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Caretaker Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Caretaker Name *</Label>
              <Input
                value={caretakerForm.caretaker_name}
                onChange={(e) => setCaretakerForm({ ...caretakerForm, caretaker_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={caretakerForm.caretaker_phone}
                onChange={(e) => setCaretakerForm({ ...caretakerForm, caretaker_phone: e.target.value })}
              />
            </div>

            <div>
              <Label>Age</Label>
              <Input
                type="number"
                value={caretakerForm.caretaker_age}
                onChange={(e) => setCaretakerForm({ ...caretakerForm, caretaker_age: e.target.value })}
              />
            </div>

            <div>
              <Label>Experience Notes</Label>
              <Textarea
                value={caretakerForm.experience_notes}
                onChange={(e) => setCaretakerForm({ ...caretakerForm, experience_notes: e.target.value })}
                placeholder="e.g., patient care to hospital"
                rows={2}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={caretakerForm.notes}
                onChange={(e) => setCaretakerForm({ ...caretakerForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCaretakerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => createCaretakerMutation.mutate(caretakerForm)}>
                Add Caretaker
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Caretaker Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Caretaker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Select Caretaker *</Label>
              <Select
                value={assignForm.caretaker_ref}
                onValueChange={(val) => {
                  const caretaker = caretakers.find(c => c.id === val);
                  setAssignForm({
                    caretaker_ref: val,
                    caretaker_name_cache: caretaker?.caretaker_name || '',
                    caretaker_phone_cache: caretaker?.caretaker_phone || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select caretaker" />
                </SelectTrigger>
                <SelectContent>
                  {caretakers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.caretaker_name} - {c.caretaker_phone || 'No phone'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedCase) return;
                  createAssignmentMutation.mutate({
                    ...assignForm,
                    homecare_case_ref: selectedCase.id
                  });
                }}
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Contact Attempt Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Contact Attempt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Target *</Label>
              <Select value={contactForm.target} onValueChange={(val) => setContactForm({ ...contactForm, target: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caretaker">Caretaker</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Result *</Label>
              <Select value={contactForm.result} onValueChange={(val) => setContactForm({ ...contactForm, result: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="message_seen">Message Seen</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={contactForm.notes}
                onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                placeholder="e.g., Call not answered, Contact Shayoutthan Sir"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowContactDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedCase) return;
                  const user = await base44.auth.me();
                  createContactAttemptMutation.mutate({
                    ...contactForm,
                    homecare_case_ref: selectedCase.id,
                    attempt_datetime: new Date().toISOString(),
                    recorded_by: user.email
                  });
                }}
              >
                Log Attempt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}