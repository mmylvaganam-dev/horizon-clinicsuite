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
  FileText,
  Activity,
  Image,
  Printer,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function DentalPatientTab({ patientId }) {
  const queryClient = useQueryClient();
  const [showEncounterDialog, setShowEncounterDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);

  const [encounterForm, setEncounterForm] = useState({
    encounter_datetime: new Date().toISOString(),
    provider_staff_ref: '',
    assistant_staff_ref: '',
    chief_complaint: '',
    note_text: '',
    status: 'draft'
  });

  const [planForm, setPlanForm] = useState({
    plan_title: '',
    plan_status: 'draft',
    estimated_total_cost: 0,
    consent_signed: false
  });

  const [attachmentForm, setAttachmentForm] = useState({
    attachment_type: 'xray',
    file: null,
    notes: ''
  });

  const { data: encounters = [] } = useQuery({
    queryKey: ['dentalEncounters', patientId],
    queryFn: () => base44.entities.DentalEncounter.filter({ patient_ref: patientId }),
  });

  const { data: toothCharts = [] } = useQuery({
    queryKey: ['dentalToothCharts', patientId],
    queryFn: () => base44.entities.DentalToothChart.filter({ patient_ref: patientId }),
  });

  const { data: treatmentPlans = [] } = useQuery({
    queryKey: ['dentalTreatmentPlans', patientId],
    queryFn: () => base44.entities.DentalTreatmentPlan.filter({ patient_ref: patientId }),
  });

  const { data: problems = [] } = useQuery({
    queryKey: ['dentalProblems', patientId],
    queryFn: () => base44.entities.DentalProblem.filter({ patient_ref: patientId, status: 'active' }),
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['dentalAttachments', patientId],
    queryFn: () => base44.entities.DentalAttachment.filter({ patient_ref: patientId }),
  });

  const { data: recalls = [] } = useQuery({
    queryKey: ['dentalRecalls', patientId],
    queryFn: () => base44.entities.DentalRecallEntry.filter({ patient_ref: patientId }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const createEncounterMutation = useMutation({
    mutationFn: (data) => base44.entities.DentalEncounter.create({
      ...data,
      patient_ref: patientId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalEncounters'] });
      setShowEncounterDialog(false);
      toast.success('Encounter created!');
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.DentalTreatmentPlan.create({
      ...data,
      patient_ref: patientId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalTreatmentPlans'] });
      setShowPlanDialog(false);
      toast.success('Treatment plan created!');
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      
      return base44.entities.DentalAttachment.create({
        patient_ref: patientId,
        attachment_type: data.attachment_type,
        file_ref: file_url,
        notes: data.notes,
        uploaded_by: user.email,
        uploaded_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalAttachments'] });
      setShowAttachmentDialog(false);
      setAttachmentForm({ attachment_type: 'xray', file: null, notes: '' });
      toast.success('Attachment uploaded!');
    },
  });

  const generateEncounterPDF = (encounter) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('DENTAL ENCOUNTER NOTE', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(encounter.encounter_datetime), 'dd MMM yyyy HH:mm')}`, 20, 30);
    doc.text(`Status: ${encounter.status.toUpperCase()}`, 20, 36);

    let y = 50;
    if (encounter.chief_complaint) {
      doc.setFontSize(12);
      doc.text('CHIEF COMPLAINT', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(encounter.chief_complaint, 25, y);
      y += 15;
    }

    if (encounter.note_text) {
      doc.setFontSize(12);
      doc.text('CLINICAL NOTES', 20, y);
      y += 8;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(encounter.note_text, 170);
      doc.text(lines, 25, y);
      y += lines.length * 5 + 15;
    }

    doc.save(`dental_encounter_${encounter.id}.pdf`);
    toast.success('PDF generated!');
  };

  const lastEncounter = encounters[0];
  const activePlan = treatmentPlans.find(p => p.plan_status === 'approved' || p.plan_status === 'in_progress');

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    signed: 'bg-blue-100 text-blue-700',
    final: 'bg-emerald-100 text-emerald-700',
    active: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-blue-100 text-blue-700'
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Visit</CardTitle>
          </CardHeader>
          <CardContent>
            {lastEncounter ? (
              <>
                <p className="text-sm text-slate-600">
                  {format(new Date(lastEncounter.encounter_datetime), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-slate-500 mt-1">{lastEncounter.chief_complaint || 'No complaint'}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No visits recorded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Problems</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{problems.length}</p>
            <p className="text-xs text-slate-500 mt-1">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Treatment Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {activePlan ? (
              <>
                <Badge className={statusColors[activePlan.plan_status]}>{activePlan.plan_status}</Badge>
                <p className="text-xs text-slate-500 mt-1">{activePlan.plan_title}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No active plan</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recalls Due</CardTitle>
          </CardHeader>
          <CardContent>
            {recalls.filter(r => r.status === 'due').length > 0 ? (
              <>
                <p className="text-2xl font-bold text-amber-600">
                  {recalls.filter(r => r.status === 'due').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Recalls pending</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No recalls due</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => setShowEncounterDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Encounter
        </Button>
        <Button variant="outline" onClick={() => setShowPlanDialog(true)}>
          <FileText className="w-4 h-4 mr-2" />
          New Treatment Plan
        </Button>
        <Button variant="outline" onClick={() => setShowAttachmentDialog(true)}>
          <Image className="w-4 h-4 mr-2" />
          Upload Attachment
        </Button>
      </div>

      {/* Encounters List */}
      <Card>
        <CardHeader>
          <CardTitle>Dental Encounters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {encounters.map((encounter) => (
            <Card key={encounter.id} className="p-4 bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={statusColors[encounter.status]}>{encounter.status}</Badge>
                    <span className="text-sm text-slate-600">
                      {format(new Date(encounter.encounter_datetime), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{encounter.chief_complaint || 'Routine visit'}</p>
                  {encounter.note_text && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{encounter.note_text}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => generateEncounterPDF(encounter)}>
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
          {encounters.length === 0 && (
            <p className="text-center text-slate-500 py-8">No encounters recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Treatment Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {treatmentPlans.map((plan) => (
            <Card key={plan.id} className="p-4 bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{plan.plan_title}</h4>
                    <Badge className={statusColors[plan.plan_status]}>{plan.plan_status}</Badge>
                  </div>
                  {plan.estimated_total_cost > 0 && (
                    <p className="text-sm font-bold text-teal-600">
                      Estimated: ${plan.estimated_total_cost.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {treatmentPlans.length === 0 && (
            <p className="text-center text-slate-500 py-8">No treatment plans</p>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments ({attachments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {attachments.map((att) => (
              <Card key={att.id} className="p-3 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => window.open(att.file_ref, '_blank')}>
                <div className="aspect-square bg-slate-100 rounded mb-2 flex items-center justify-center">
                  <Image className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-xs font-medium text-slate-900">{att.attachment_type}</p>
                <p className="text-xs text-slate-500">{format(new Date(att.uploaded_at), 'MMM d')}</p>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Encounter Dialog */}
      <Dialog open={showEncounterDialog} onOpenChange={setShowEncounterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Dental Encounter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={encounterForm.encounter_datetime.substring(0, 16)}
                onChange={(e) => setEncounterForm({ ...encounterForm, encounter_datetime: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div>
              <Label>Provider (Dentist) *</Label>
              <Select value={encounterForm.provider_staff_ref} onValueChange={(val) => setEncounterForm({ ...encounterForm, provider_staff_ref: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dentist" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chief Complaint</Label>
              <Textarea
                value={encounterForm.chief_complaint}
                onChange={(e) => setEncounterForm({ ...encounterForm, chief_complaint: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Clinical Notes</Label>
              <Textarea
                value={encounterForm.note_text}
                onChange={(e) => setEncounterForm({ ...encounterForm, note_text: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEncounterDialog(false)}>Cancel</Button>
              <Button onClick={() => createEncounterMutation.mutate(encounterForm)}>
                Create Encounter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Treatment Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Plan Title *</Label>
              <Input
                value={planForm.plan_title}
                onChange={(e) => setPlanForm({ ...planForm, plan_title: e.target.value })}
              />
            </div>
            <div>
              <Label>Estimated Total Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={planForm.estimated_total_cost}
                onChange={(e) => setPlanForm({ ...planForm, estimated_total_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
              <Button onClick={() => createPlanMutation.mutate(planForm)}>
                Create Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Attachment Dialog */}
      <Dialog open={showAttachmentDialog} onOpenChange={setShowAttachmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Type</Label>
              <Select value={attachmentForm.attachment_type} onValueChange={(val) => setAttachmentForm({ ...attachmentForm, attachment_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xray">X-Ray</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="consent">Consent Form</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File *</Label>
              <Input
                type="file"
                onChange={(e) => setAttachmentForm({ ...attachmentForm, file: e.target.files[0] })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={attachmentForm.notes}
                onChange={(e) => setAttachmentForm({ ...attachmentForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAttachmentDialog(false)}>Cancel</Button>
              <Button onClick={() => uploadAttachmentMutation.mutate(attachmentForm)} disabled={!attachmentForm.file}>
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}