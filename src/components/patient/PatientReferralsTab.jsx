import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PatientReferralsTab({ patientId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [consultDialogOpen, setConsultDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [formData, setFormData] = useState({
    specialty: '',
    specialist_name: '',
    referral_reason: '',
    priority: 'routine'
  });
  const [consultNote, setConsultNote] = useState('');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['patientReferrals', patientId],
    queryFn: () => base44.entities.ReferralOut.filter({ patient_id: patientId }),
  });

  const createReferralMutation = useMutation({
    mutationFn: async (data) => {
      const referral = await base44.entities.ReferralOut.create({
        ...data,
        patient_id: patientId,
        referring_provider: user.id,
        referring_provider_email: user.email,
        referral_date: new Date().toISOString().split('T')[0]
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        patient_id: patientId,
        module: 'REFERRALS',
        action: 'create_referral',
        record_type: 'ReferralOut',
        record_id: referral.id,
        metadata: { specialty: data.specialty }
      });

      return referral;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReferrals', patientId] });
      setDialogOpen(false);
      setFormData({ specialty: '', specialist_name: '', referral_reason: '', priority: 'routine' });
      toast.success('Referral created');
    },
  });

  const acknowledgeConsultMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ReferralOut.update(selectedReferral.id, {
        consult_note_text: consultNote,
        consult_note_received: true,
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        patient_id: patientId,
        module: 'REFERRALS',
        action: 'acknowledge_consult',
        record_type: 'ReferralOut',
        record_id: selectedReferral.id,
        metadata: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReferrals', patientId] });
      setConsultDialogOpen(false);
      setSelectedReferral(null);
      setConsultNote('');
      toast.success('Consult note acknowledged');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Referrals & Consults</h3>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Referral
        </Button>
      </div>

      {referrals.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No referrals yet</p>
      ) : (
        <div className="space-y-2">
          {referrals.map((referral) => (
            <div key={referral.id} className="p-3 rounded-lg border bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{referral.specialty}</h4>
                    <Badge className={
                      referral.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      referral.status === 'seen' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {referral.status}
                    </Badge>
                    {referral.consult_note_received && !referral.acknowledged_by && (
                      <Badge className="bg-rose-100 text-rose-700">Requires Review</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{referral.specialist_name}</p>
                  <p className="text-sm text-slate-500 mt-1">{referral.referral_reason}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Referred: {format(new Date(referral.referral_date), 'MMM d, yyyy')}
                  </p>
                  {referral.consult_note_text && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <p className="font-medium text-blue-900 mb-1">Consult Response:</p>
                      <p className="text-blue-800">{referral.consult_note_text}</p>
                      {referral.acknowledged_by && (
                        <p className="text-xs text-blue-600 mt-1">
                          ✓ Acknowledged {format(new Date(referral.acknowledged_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {referral.consult_note_received && !referral.acknowledged_by && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReferral(referral);
                      setConsultNote(referral.consult_note_text || '');
                      setConsultDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Specialty *</Label>
              <Input
                value={formData.specialty}
                onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                placeholder="e.g., Cardiology, Orthopedics"
              />
            </div>

            <div>
              <Label>Specialist Name</Label>
              <Input
                value={formData.specialist_name}
                onChange={(e) => setFormData({...formData, specialist_name: e.target.value})}
                placeholder="Dr. Name"
              />
            </div>

            <div>
              <Label>Referral Reason *</Label>
              <Textarea
                value={formData.referral_reason}
                onChange={(e) => setFormData({...formData, referral_reason: e.target.value})}
                rows={4}
                placeholder="Reason for referral..."
              />
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createReferralMutation.mutate(formData)}
                disabled={!formData.specialty || !formData.referral_reason || createReferralMutation.isPending}
              >
                Create Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={consultDialogOpen} onOpenChange={setConsultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Consult Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Consult Note</Label>
              <Textarea
                value={consultNote}
                onChange={(e) => setConsultNote(e.target.value)}
                rows={6}
                className="bg-slate-50"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConsultDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => acknowledgeConsultMutation.mutate()}
                disabled={acknowledgeConsultMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Acknowledge & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}