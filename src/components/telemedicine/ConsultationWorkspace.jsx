import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, Stethoscope, CheckCircle, Video, Circle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ConsultationWorkspace({ appt, open, onClose, onSaved }) {
  const qc = useQueryClient();
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [activeTab, setActiveTab] = useState('soap');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingLoading, setRecordingLoading] = useState(false);

  useEffect(() => {
    if (appt) {
      // Pre-populate existing note if any
      const existing = appt.soap_note || '';
      // Try to parse structured SOAP if saved as JSON, otherwise put in subjective
      try {
        const parsed = JSON.parse(existing);
        if (parsed.subjective !== undefined) setSoap(parsed);
        else setSoap({ subjective: existing, objective: '', assessment: '', plan: '' });
      } catch {
        setSoap({ subjective: existing, objective: '', assessment: '', plan: '' });
      }
      setDiagnosis(appt.diagnosis || '');
      setPrescriptionNotes(appt.prescription_notes || '');
      setRecordingUrl(appt.recording_url || '');
    }
  }, [appt]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.TeleAppointment.update(appt.id, {
      soap_note: JSON.stringify(soap),
      diagnosis,
      prescription_notes: prescriptionNotes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] });
      toast.success('Consultation notes saved');
      onSaved?.();
    },
  });

  const saveRecordingUrl = async (url) => {
    setRecordingLoading(true);
    try {
      await base44.entities.TeleAppointment.update(appt.id, { recording_url: url });
      toast.success('Recording link saved');
      qc.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] });
      onSaved?.();
    } finally {
      setRecordingLoading(false);
    }
  };

  const completeMutation = useMutation({
    mutationFn: () => base44.entities.TeleAppointment.update(appt.id, {
      soap_note: JSON.stringify(soap),
      diagnosis,
      prescription_notes: prescriptionNotes,
      recording_url: recordingUrl,
      status: 'COMPLETED',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleAppointmentsProvider'] });
      toast.success('Consultation completed and notes saved');
      onSaved?.();
      onClose();
    },
  });

  if (!appt) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            Consultation EMR
          </DialogTitle>
        </DialogHeader>

        {/* Patient Info Bar */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                {appt.patient_name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{appt.patient_name || 'Unknown Patient'}</p>
                <p className="text-xs text-slate-500">Provider: Dr. {appt.provider_name || '—'}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-teal-100 text-teal-800 border-0">{appt.status}</Badge>
              {appt.scheduled_time && (
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(appt.scheduled_time), 'dd MMM yyyy, HH:mm')}
                </p>
              )}
            </div>
          </div>
          {appt.patient_notes && (
            <div className="bg-white rounded-lg px-3 py-2 text-sm text-slate-600 italic mt-2">
              <span className="font-medium text-slate-700 not-italic">Chief Complaint: </span>
              {appt.patient_notes}
            </div>
          )}
        </div>

        {/* EMR Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="soap">SOAP Notes</TabsTrigger>
            <TabsTrigger value="dx">Diagnosis & Plan</TabsTrigger>
            <TabsTrigger value="rx">Prescription</TabsTrigger>
          </TabsList>

          <TabsContent value="soap" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              {[
                { key: 'subjective', label: 'S — Subjective', placeholder: "Patient's description of symptoms, history, complaints..." },
                { key: 'objective', label: 'O — Objective', placeholder: 'Physical examination findings, vitals, test results...' },
                { key: 'assessment', label: 'A — Assessment', placeholder: 'Clinical impression, differential diagnosis...' },
                { key: 'plan', label: 'P — Plan', placeholder: 'Treatment plan, referrals, follow-up instructions...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="font-semibold text-slate-700">{label}</Label>
                  <Textarea
                    className="mt-1 min-h-[80px]"
                    placeholder={placeholder}
                    value={soap[key]}
                    onChange={e => setSoap(s => ({ ...s, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dx" className="space-y-4 mt-4">
            <div>
              <Label className="font-semibold text-slate-700">Primary Diagnosis / ICD Code</Label>
              <Input
                className="mt-1"
                placeholder="e.g. J06.9 — Acute upper respiratory infection, unspecified"
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
              />
            </div>
            <div>
              <Label className="font-semibold text-slate-700">Assessment Notes</Label>
              <Textarea
                className="mt-1 min-h-[100px]"
                placeholder="Additional clinical assessment, findings summary..."
                value={soap.assessment}
                onChange={e => setSoap(s => ({ ...s, assessment: e.target.value }))}
              />
            </div>
            <div>
              <Label className="font-semibold text-slate-700">Follow-up Plan</Label>
              <Textarea
                className="mt-1 min-h-[80px]"
                placeholder="Referrals, investigations ordered, follow-up appointments..."
                value={soap.plan}
                onChange={e => setSoap(s => ({ ...s, plan: e.target.value }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="rx" className="space-y-4 mt-4">
            <div>
              <Label className="font-semibold text-slate-700">Prescription Notes</Label>
              <Textarea
                className="mt-1 min-h-[160px]"
                placeholder={`Medications prescribed:\n1. Drug Name — Dose — Frequency — Duration\n2. ...\n\nSpecial instructions:\n...`}
                value={prescriptionNotes}
                onChange={e => setPrescriptionNotes(e.target.value)}
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Note:</strong> These are consultation prescription notes. To issue a formal dispensable prescription, use the main Prescriptions module and link it to this patient.
            </div>
          </TabsContent>
        </Tabs>

        {/* Recording Panel */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Circle className="w-4 h-4 text-red-500 fill-red-500" />
            Session Recording
          </div>
          {appt.status === 'IN_PROGRESS' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
              Recording is enabled for this room. Use the <strong>Whereby room controls</strong> during the call to start/stop cloud recording. Once complete, paste the recording link below.
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Paste recording URL here (e.g. Whereby cloud recording link)..."
              value={recordingUrl}
              onChange={e => setRecordingUrl(e.target.value)}
              className="flex-1 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!recordingUrl || recordingLoading}
              onClick={() => saveRecordingUrl(recordingUrl)}
            >
              {recordingLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
          {recordingUrl && (
            <a
              href={recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Recording
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          {appt.status !== 'COMPLETED' && (
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {completeMutation.isPending ? 'Completing...' : 'Complete Consultation'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}