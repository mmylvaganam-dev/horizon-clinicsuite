import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Network, Plus, ShieldCheck, ShieldOff, Clock, Building2,
  AlertTriangle, CheckCircle2, Eye, Stethoscope, FlaskConical, Pill
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCESS_LEVELS = [
  { value: 'read_only', label: 'Read Only (Basic Profile)', icon: Eye, color: 'bg-blue-100 text-blue-700' },
  { value: 'full_chart', label: 'Full Chart Access', icon: Stethoscope, color: 'bg-teal-100 text-teal-700' },
  { value: 'labs_only', label: 'Labs & Diagnostics Only', icon: FlaskConical, color: 'bg-purple-100 text-purple-700' },
  { value: 'medications_only', label: 'Medications Only', icon: Pill, color: 'bg-green-100 text-green-700' },
];

export default function PatientCareAccessManager({ patient, currentOrgId, currentOrgName, isAdmin }) {
  const queryClient = useQueryClient();
  const [grantOpen, setGrantOpen] = useState(false);
  const [form, setForm] = useState({
    granted_org_id: '',
    access_level: 'read_only',
    reason: '',
    consent_obtained: false,
    consent_notes: '',
    expires_at: '',
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allOrgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.filter({ status: 'active' }),
  });

  const { data: accessList = [] } = useQuery({
    queryKey: ['patientCareAccess', patient.id],
    queryFn: () => base44.entities.PatientCareAccess.filter({ patient_id: patient.id }, '-granted_at'),
    enabled: !!patient.id,
  });

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!form.granted_org_id) throw new Error('Please select an organization');
      if (!form.reason) throw new Error('Please provide a reason for sharing');
      if (!form.consent_obtained) throw new Error('Patient consent must be obtained before sharing');

      const org = allOrgs.find(o => o.id === form.granted_org_id);

      await base44.entities.PatientCareAccess.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        home_org_id: currentOrgId,
        home_org_name: currentOrgName,
        granted_org_id: form.granted_org_id,
        granted_org_name: org?.name || '',
        access_level: form.access_level,
        reason: form.reason,
        consent_obtained: form.consent_obtained,
        consent_notes: form.consent_notes,
        expires_at: form.expires_at || null,
        status: 'active',
        granted_by: user?.id,
        granted_by_email: user?.email,
        granted_at: new Date().toISOString(),
      });

      // Audit log
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        user_email: user?.email,
        organization_id: currentOrgId,
        patient_id: patient.id,
        module: 'CARE_ACCESS',
        action: 'grant_access',
        record_type: 'PatientCareAccess',
        metadata: { granted_to: org?.name, access_level: form.access_level, reason: form.reason }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Care access granted successfully');
      setGrantOpen(false);
      setForm({ granted_org_id: '', access_level: 'read_only', reason: '', consent_obtained: false, consent_notes: '', expires_at: '' });
    },
    onError: (e) => toast.error(e.message)
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ accessId, reason }) => {
      await base44.entities.PatientCareAccess.update(accessId, {
        status: 'revoked',
        revoked_by: user?.email,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Access revoked');
    },
    onError: (e) => toast.error(e.message)
  });

  const otherOrgs = allOrgs.filter(o => o.id !== currentOrgId);
  const activeAccess = accessList.filter(a => a.status === 'active');
  const revokedAccess = accessList.filter(a => a.status !== 'active');

  const getLevelInfo = (val) => ACCESS_LEVELS.find(l => l.value === val);

  if (!isAdmin) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-slate-500">
            <Network className="w-5 h-5" />
            <div>
              <p className="font-medium text-slate-700">Care Network Access</p>
              <p className="text-sm">Only platform administrators can manage cross-clinic record sharing.</p>
            </div>
          </div>
          {activeAccess.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-600">Currently shared with:</p>
              {activeAccess.map(a => (
                <div key={a.id} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                  <Building2 className="w-4 h-4 text-teal-500" />
                  <span>{a.granted_org_name}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{getLevelInfo(a.access_level)?.label}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Network className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-900 text-sm">Cross-Clinic Care Network</p>
          <p className="text-xs text-blue-700 mt-1">
            Grant other clinics or hospitals in the system read access to this patient's record for continuity of care. 
            Patient consent is mandatory. All access is logged and auditable. Patient will eventually self-manage this.
          </p>
        </div>
      </div>

      {/* Active Access */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Active Care Access
            {activeAccess.length > 0 && (
              <Badge className="bg-teal-100 text-teal-700 border-0">{activeAccess.length}</Badge>
            )}
          </CardTitle>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setGrantOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Grant Access
          </Button>
        </CardHeader>
        <CardContent>
          {activeAccess.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Network className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No care access granted yet</p>
              <p className="text-xs text-slate-400 mt-1">Grant access to other clinics for continuity of care</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAccess.map(access => {
                const levelInfo = getLevelInfo(access.access_level);
                const LevelIcon = levelInfo?.icon || Eye;
                const isExpired = access.expires_at && new Date(access.expires_at) < new Date();
                return (
                  <div key={access.id} className={`border rounded-lg p-4 ${isExpired ? 'border-amber-200 bg-amber-50' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{access.granted_org_name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${levelInfo?.color}`}>
                              <LevelIcon className="w-3 h-3 mr-1" />{levelInfo?.label}
                            </Badge>
                            {access.consent_obtained && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />Consent ✓
                              </Badge>
                            )}
                            {isExpired && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                <Clock className="w-3 h-3 mr-1" />Expired
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{access.reason}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Granted by {access.granted_by_email} on {format(new Date(access.granted_at), 'MMM d, yyyy')}
                            {access.expires_at && ` · Expires ${format(new Date(access.expires_at), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                        onClick={() => revokeMutation.mutate({ accessId: access.id, reason: 'Revoked by admin' })}
                        disabled={revokeMutation.isPending}
                      >
                        <ShieldOff className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked History */}
      {revokedAccess.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
              <ShieldOff className="w-4 h-4" />
              Revoked / Expired History ({revokedAccess.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revokedAccess.map(access => (
                <div key={access.id} className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium text-slate-700">{access.granted_org_name}</span>
                    <span className="text-slate-400 ml-2">— {getLevelInfo(access.access_level)?.label}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {access.revoked_at ? `Revoked ${format(new Date(access.revoked_at), 'MMM d, yyyy')}` : 'Expired'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grant Access Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-teal-600" />
              Grant Care Access
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>Patient consent required.</strong> You must confirm that {patient.first_name} {patient.last_name} has consented to sharing their record with the selected organization before proceeding.
              </p>
            </div>

            <div>
              <Label>Organization to Grant Access *</Label>
              <Select value={form.granted_org_id} onValueChange={v => setForm({ ...form, granted_org_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic or hospital..." />
                </SelectTrigger>
                <SelectContent>
                  {otherOrgs.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Access Level *</Label>
              <Select value={form.access_level} onValueChange={v => setForm({ ...form, access_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason for Sharing *</Label>
              <Textarea
                rows={2}
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Specialist referral to cardiology, emergency care, continuity after transfer..."
              />
            </div>

            <div>
              <Label>Access Expires On (optional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-slate-400 mt-1">Leave blank for indefinite access (can be revoked anytime)</p>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Patient Consent Confirmed *</p>
                  <p className="text-xs text-slate-500">I confirm the patient has verbally/written consented</p>
                </div>
                <Switch
                  checked={form.consent_obtained}
                  onCheckedChange={v => setForm({ ...form, consent_obtained: v })}
                />
              </div>
              {form.consent_obtained && (
                <Textarea
                  rows={2}
                  value={form.consent_notes}
                  onChange={e => setForm({ ...form, consent_notes: e.target.value })}
                  placeholder="How was consent obtained? (verbal, written form, patient portal...)"
                />
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                disabled={grantMutation.isPending}
                onClick={() => grantMutation.mutate()}
              >
                {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}