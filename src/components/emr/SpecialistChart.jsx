import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCheck, CheckCircle, Plus, Upload, FileText, Sparkles, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import SectionAIInput from './SectionAIInput';

const STATUS_COLORS = {
  completed: 'bg-emerald-100 text-emerald-700',
  seen: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
};

export default function SpecialistChart({ patientId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addingConsult, setAddingConsult] = useState(null); // referral id to add consult note to
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ specialty: '', specialist_name: '', referral_reason: '', referral_date: format(new Date(), 'yyyy-MM-dd') });

  const { data: referrals = [] } = useQuery({
    queryKey: ['patientReferrals', patientId],
    queryFn: () => base44.entities.ReferralOut.filter({ patient_id: patientId }, '-referral_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const addReferralMutation = useMutation({
    mutationFn: (data) => base44.entities.ReferralOut.create({
      patient_id: patientId,
      organization_id: '',
      status: 'pending',
      ...data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReferrals', patientId] });
      setShowAdd(false);
      setForm({ specialty: '', specialist_name: '', referral_reason: '', referral_date: format(new Date(), 'yyyy-MM-dd') });
      toast.success('Referral added');
    },
    onError: () => toast.error('Failed to add referral'),
  });

  const updateReferralMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReferralOut.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReferrals', patientId] });
      setAddingConsult(null);
      toast.success('Consult note saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  // AI: extract specialty/reason from voice/upload for new referral
  const handleReferralAI = async ({ text, fileUrl, mode }) => {
    setAiLoading(true);
    try {
      const prompt = `Extract specialist referral details from the following clinical text or document.
Return JSON: { specialty, specialist_name, referral_reason }
Text: ${text || '(see uploaded file)'}`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        ...(fileUrl ? { file_urls: [fileUrl] } : {}),
        response_json_schema: {
          type: 'object',
          properties: {
            specialty: { type: 'string' },
            specialist_name: { type: 'string' },
            referral_reason: { type: 'string' },
          },
        },
      });
      setForm(prev => ({
        ...prev,
        specialty: res.specialty || prev.specialty,
        specialist_name: res.specialist_name || prev.specialist_name,
        referral_reason: res.referral_reason || prev.referral_reason,
      }));
      setShowAdd(true);
      toast.success('Fields pre-filled from AI — review before saving');
    } catch {
      toast.error('AI extraction failed');
    } finally {
      setAiLoading(false);
    }
  };

  // AI: extract consult note from upload/voice for an existing referral
  const handleConsultAI = async ({ text, fileUrl }) => {
    setAiLoading(true);
    try {
      const prompt = `Extract the specialist consultation report/findings from this clinical document or text.
Return JSON: { consult_note_text, recommendations }
Text: ${text || '(see uploaded file)'}`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        ...(fileUrl ? { file_urls: [fileUrl] } : {}),
        response_json_schema: {
          type: 'object',
          properties: {
            consult_note_text: { type: 'string' },
            recommendations: { type: 'string' },
          },
        },
      });
      const noteText = [res.consult_note_text, res.recommendations].filter(Boolean).join('\n\nRecommendations: ');
      updateReferralMutation.mutate({
        id: addingConsult.id,
        data: { consult_note_text: noteText, status: 'seen' },
      });
    } catch {
      toast.error('AI extraction failed');
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <SectionAIInput
          label="AI: Add from Voice/Upload"
          placeholder="Dictate or paste referral details — e.g. 'Refer to cardiology for chest pain work-up'"
          onGenerate={handleReferralAI}
          disabled={aiLoading}
        />
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Referral
        </Button>
      </div>

      {referrals.length === 0 ? (
        <p className="text-sm text-slate-500 italic text-center py-8">No specialist consultations recorded</p>
      ) : (
        <div className="space-y-3">
          {referrals.map((referral) => (
            <div key={referral.id} className="p-4 rounded-lg border bg-white">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{referral.specialty}</p>
                    <Badge className={STATUS_COLORS[referral.status] || STATUS_COLORS.pending}>
                      {referral.status}
                    </Badge>
                  </div>
                  {referral.specialist_name && (
                    <p className="text-sm text-slate-600 mb-1">Dr. {referral.specialist_name}</p>
                  )}
                  <div className="bg-slate-50 rounded p-3 mb-2">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Reason:</span> {referral.referral_reason}
                    </p>
                  </div>
                  {referral.consult_note_text ? (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <p className="text-sm font-semibold text-blue-900">Specialist Report:</p>
                      </div>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{referral.consult_note_text}</p>
                      {referral.acknowledged_at && (
                        <p className="text-xs text-blue-600 mt-2">
                          ✓ Reviewed {format(new Date(referral.acknowledged_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-indigo-700 border-indigo-300 hover:bg-indigo-50 gap-2"
                      onClick={() => setAddingConsult(referral)}
                    >
                      <Upload className="w-3.5 h-3.5" /> Add Consult Report
                    </Button>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Referred: {format(new Date(referral.referral_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Referral Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Specialist Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Specialty *</Label>
              <Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Cardiology, Neurology" />
            </div>
            <div>
              <Label>Specialist Name</Label>
              <Input value={form.specialist_name} onChange={e => setForm({ ...form, specialist_name: e.target.value })} placeholder="Dr. ..." />
            </div>
            <div>
              <Label>Referral Date</Label>
              <Input type="date" value={form.referral_date} onChange={e => setForm({ ...form, referral_date: e.target.value })} />
            </div>
            <div>
              <Label>Reason for Referral *</Label>
              <Textarea rows={3} value={form.referral_reason} onChange={e => setForm({ ...form, referral_reason: e.target.value })} placeholder="Clinical indication…" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                onClick={() => addReferralMutation.mutate(form)}
                disabled={!form.specialty || !form.referral_reason || addReferralMutation.isPending}
              >
                {addReferralMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Consult Note Dialog */}
      <Dialog open={!!addingConsult} onOpenChange={() => setAddingConsult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Consult Report — {addingConsult?.specialty}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <SectionAIInput
              label="Extract from PDF / Voice"
              placeholder="Paste or dictate the specialist report…"
              onGenerate={handleConsultAI}
              disabled={aiLoading || updateReferralMutation.isPending}
            />
            <div>
              <Label>Or type the consult note directly:</Label>
              <Textarea
                rows={6}
                placeholder="Specialist findings and recommendations…"
                id="manual-consult"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddingConsult(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  const t = document.getElementById('manual-consult')?.value;
                  if (!t?.trim()) { toast.error('Enter a consult note'); return; }
                  updateReferralMutation.mutate({ id: addingConsult.id, data: { consult_note_text: t, status: 'seen' } });
                }}
                disabled={updateReferralMutation.isPending}
              >
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}