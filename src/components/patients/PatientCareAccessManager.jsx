import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
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
  AlertTriangle, CheckCircle2, Eye, Stethoscope, FlaskConical, Pill,
  Send, Users, GitMerge, Info, UserCheck, XCircle, Hourglass
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCESS_LEVELS = [
  { value: 'read_only', label: 'Read Only (Basic Profile)', icon: Eye, color: 'bg-blue-100 text-blue-700' },
  { value: 'full_chart', label: 'Full Chart Access', icon: Stethoscope, color: 'bg-teal-100 text-teal-700' },
  { value: 'labs_only', label: 'Labs & Diagnostics Only', icon: FlaskConical, color: 'bg-purple-100 text-purple-700' },
  { value: 'medications_only', label: 'Medications Only', icon: Pill, color: 'bg-green-100 text-green-700' },
];

function getLevelInfo(val) {
  return ACCESS_LEVELS.find(l => l.value === val);
}

// ─── Platform Owner View ─────────────────────────────────────────────────────
function PlatformOwnerView({ patient, allOrgs, accessList, user, queryClient }) {
  const [grantOpen, setGrantOpen] = useState(false);
  const [form, setForm] = useState({
    granted_org_id: '',
    access_level: 'read_only',
    reason: '',
    consent_obtained: false,
    consent_notes: '',
    expires_at: '',
  });

  // Find all orgs where this patient might exist (by PHN or name match)
  const { data: matchingPatients = [] } = useQuery({
    queryKey: ['patientAllOrgs', patient.id, patient.phn],
    queryFn: async () => {
      if (!patient.phn) return [];
      return base44.entities.Patient.filter({ phn: patient.phn });
    },
    enabled: !!patient.phn,
  });

  const registeredOrgIds = matchingPatients.map(p => p.organization_id).filter(Boolean);
  const registeredOrgs = allOrgs.filter(o => registeredOrgIds.includes(o.id));

  const activeAccess = accessList.filter(a => a.status === 'active');
  const revokedAccess = accessList.filter(a => a.status !== 'active');

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!form.granted_org_id) throw new Error('Please select an organization');
      if (!form.reason) throw new Error('Please provide a reason');
      if (!form.consent_obtained) throw new Error('Patient consent must be confirmed');
      const org = allOrgs.find(o => o.id === form.granted_org_id);
      const homeOrg = allOrgs.find(o => o.id === patient.organization_id);
      await base44.entities.PatientCareAccess.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        home_org_id: patient.organization_id,
        home_org_name: homeOrg?.name || '',
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Care access granted');
      setGrantOpen(false);
      setForm({ granted_org_id: '', access_level: 'read_only', reason: '', consent_obtained: false, consent_notes: '', expires_at: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (accessId) => {
      await base44.entities.PatientCareAccess.update(accessId, {
        status: 'revoked', revoked_by: user?.email, revoked_at: new Date().toISOString(), revoke_reason: 'Revoked by platform owner',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Access revoked');
    },
  });

  const otherOrgs = allOrgs.filter(o => o.id !== patient.organization_id);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
        <GitMerge className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-purple-900 text-sm">Platform Owner — Cross-Clinic Access Control</p>
          <p className="text-xs text-purple-700 mt-1">
            You can see all clinics this patient is registered in, grant access to any organization, approve pending requests, and revoke access at any time.
          </p>
        </div>
      </div>

      {/* Patient registered at */}
      {registeredOrgs.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Users className="w-4 h-4 text-purple-500" />
              Patient Registered At ({registeredOrgs.length} clinic{registeredOrgs.length > 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {registeredOrgs.map(org => (
                <div key={org.id} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg text-sm">
                  <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="font-medium text-slate-800">{org.name}</span>
                  <Badge variant="outline" className="text-xs capitalize ml-auto">{org.type}</Badge>
                  {org.id === patient.organization_id && (
                    <Badge className="bg-purple-600 text-white text-xs border-0">Home Clinic</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Access Grants */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Active Access Grants
            {activeAccess.length > 0 && <Badge className="bg-teal-100 text-teal-700 border-0">{activeAccess.length}</Badge>}
          </CardTitle>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setGrantOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Grant Access
          </Button>
        </CardHeader>
        <CardContent>
          {activeAccess.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Network className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No access granted yet</p>
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
                        <Building2 className="w-5 h-5 text-slate-500 mt-0.5" />
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
                            {isExpired && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">Expired</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{access.reason}</p>
                          <p className="text-xs text-slate-400">
                            By {access.granted_by_email} · {format(new Date(access.granted_at), 'dd MMM yyyy')}
                            {access.expires_at && ` · Expires ${format(new Date(access.expires_at), 'dd MMM yyyy')}`}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                        onClick={() => revokeMutation.mutate(access.id)} disabled={revokeMutation.isPending}>
                        <ShieldOff className="w-4 h-4 mr-1" /> Revoke
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {revokedAccess.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
              <ShieldOff className="w-4 h-4" /> Revoked / Expired History ({revokedAccess.length})
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
                  <span className="text-xs text-slate-400">
                    {access.revoked_at ? `Revoked ${format(new Date(access.revoked_at), 'dd MMM yyyy')}` : 'Expired'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grant Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-teal-600" /> Grant Care Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>Patient consent required</strong> before sharing {patient.first_name}'s record.
              </p>
            </div>
            <div>
              <Label>Organization to Grant Access *</Label>
              <Select value={form.granted_org_id} onValueChange={v => setForm({ ...form, granted_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select clinic or hospital..." /></SelectTrigger>
                <SelectContent>
                  {otherOrgs.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name} ({org.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Level *</Label>
              <Select value={form.access_level} onValueChange={v => setForm({ ...form, access_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Specialist referral, continuity of care..." />
            </div>
            <div>
              <Label>Expires On (optional)</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Patient Consent Confirmed *</p>
                  <p className="text-xs text-slate-500">I confirm consent has been obtained</p>
                </div>
                <Switch checked={form.consent_obtained} onCheckedChange={v => setForm({ ...form, consent_obtained: v })} />
              </div>
              {form.consent_obtained && (
                <Textarea rows={2} value={form.consent_notes} onChange={e => setForm({ ...form, consent_notes: e.target.value })}
                  placeholder="How was consent obtained?" />
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" disabled={grantMutation.isPending}
                onClick={() => grantMutation.mutate()}>
                {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Org Admin View ──────────────────────────────────────────────────────────
function OrgAdminView({ patient, allOrgs, accessList, currentOrgId, currentOrgName, user }) {
  const queryClient = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState({ target_org_id: '', access_level: 'read_only', reason: '' });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myAccessRequests', patient.id, currentOrgId],
    queryFn: () => base44.entities.PatientAccessRequest.filter({ patient_id: patient.id, requesting_org_id: currentOrgId }),
    enabled: !!patient.id && !!currentOrgId,
  });

  const activeAccess = accessList.filter(a => a.status === 'active' && a.granted_org_id === currentOrgId);

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!form.target_org_id) throw new Error('Please select a target organization');
      if (!form.reason) throw new Error('Please provide a reason');
      const targetOrg = allOrgs.find(o => o.id === form.target_org_id);
      await base44.entities.PatientAccessRequest.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        request_type: 'org_to_org',
        requesting_org_id: currentOrgId,
        requesting_org_name: currentOrgName,
        target_org_id: form.target_org_id,
        target_org_name: targetOrg?.name || '',
        access_level: form.access_level,
        reason: form.reason,
        status: 'pending',
        requested_by_email: user?.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAccessRequests', patient.id, currentOrgId] });
      toast.success('Access request submitted — platform owner will review');
      setRequestOpen(false);
      setForm({ target_org_id: '', access_level: 'read_only', reason: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientAccessRequest.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAccessRequests', patient.id, currentOrgId] });
      toast.success('Request cancelled');
    },
  });

  const otherOrgs = allOrgs.filter(o => o.id !== currentOrgId);

  const statusBadge = (status) => {
    const map = {
      pending: { cls: 'bg-amber-100 text-amber-700', icon: Hourglass, label: 'Pending Review' },
      approved: { cls: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Approved' },
      rejected: { cls: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
      cancelled: { cls: 'bg-slate-100 text-slate-500', icon: XCircle, label: 'Cancelled' },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return <Badge variant="outline" className={`text-xs ${s.cls}`}><Icon className="w-3 h-3 mr-1" />{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Send className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-900 text-sm">Request Cross-Clinic Access</p>
          <p className="text-xs text-blue-700 mt-1">
            As an organization admin, you can request access to this patient's records held at another clinic. The platform owner will review and approve your request.
          </p>
        </div>
      </div>

      {/* Currently granted access to this org */}
      {activeAccess.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-teal-700">
              <ShieldCheck className="w-4 h-4" /> Access Currently Granted to Your Clinic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAccess.map(a => {
              const levelInfo = getLevelInfo(a.access_level);
              const LevelIcon = levelInfo?.icon || Eye;
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg text-sm">
                  <ShieldCheck className="w-4 h-4 text-teal-500" />
                  <div>
                    <p className="font-medium text-slate-800">From: {a.home_org_name}</p>
                    <Badge variant="outline" className={`text-xs mt-1 ${levelInfo?.color}`}>
                      <LevelIcon className="w-3 h-3 mr-1" />{levelInfo?.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* My Requests */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-5 h-5 text-blue-600" />
            My Access Requests
            {myRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-0">{myRequests.filter(r => r.status === 'pending').length} pending</Badge>
            )}
          </CardTitle>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setRequestOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Request Access
          </Button>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Send className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No access requests submitted</p>
              <p className="text-xs text-slate-400 mt-1">Request access to patient records at other clinics</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(req => (
                <div key={req.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Requesting from: <span className="text-blue-700">{req.target_org_name || 'Unknown Clinic'}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {statusBadge(req.status)}
                        <Badge variant="outline" className={`text-xs ${getLevelInfo(req.access_level)?.color}`}>
                          {getLevelInfo(req.access_level)?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{req.reason}</p>
                      {req.review_notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-1">
                          <strong>Review note:</strong> {req.review_notes}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Submitted {format(new Date(req.created_date), 'dd MMM yyyy')}
                        {req.reviewed_at && ` · Reviewed ${format(new Date(req.reviewed_at), 'dd MMM yyyy')}`}
                      </p>
                    </div>
                    {req.status === 'pending' && (
                      <Button variant="outline" size="sm" className="text-slate-500 text-xs flex-shrink-0"
                        onClick={() => cancelMutation.mutate(req.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" /> Request Care Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <p className="text-xs text-blue-800">
                Your request will be sent to the <strong>platform owner</strong> for review. You'll see the status update here once reviewed.
              </p>
            </div>
            <div>
              <Label>Target Clinic / Hospital *</Label>
              <Select value={form.target_org_id} onValueChange={v => setForm({ ...form, target_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select organization..." /></SelectTrigger>
                <SelectContent>
                  {otherOrgs.map(org => <SelectItem key={org.id} value={org.id}>{org.name} ({org.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Level Required *</Label>
              <Select value={form.access_level} onValueChange={v => setForm({ ...form, access_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clinical Reason *</Label>
              <Textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Patient referred to us from this clinic, need to view lab history..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" disabled={requestMutation.isPending}
                onClick={() => requestMutation.mutate()}>
                {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Patient Self View ───────────────────────────────────────────────────────
function PatientSelfView({ patient, allOrgs, accessList, user, queryClient }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState({ target_org_id: '', access_level: 'read_only', reason: '' });

  const { data: selfRequests = [] } = useQuery({
    queryKey: ['selfAccessRequests', patient.id],
    queryFn: () => base44.entities.PatientAccessRequest.filter({ patient_id: patient.id, request_type: 'patient_self' }),
    enabled: !!patient.id,
  });

  const activeAccess = accessList.filter(a => a.status === 'active');

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!form.target_org_id) throw new Error('Please select a clinic');
      if (!form.reason) throw new Error('Please provide a reason');
      const org = allOrgs.find(o => o.id === form.target_org_id);
      await base44.entities.PatientAccessRequest.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        request_type: 'patient_self',
        requesting_org_id: patient.organization_id,
        requesting_org_name: '',
        target_org_id: form.target_org_id,
        target_org_name: org?.name || '',
        access_level: form.access_level,
        reason: form.reason,
        status: 'pending',
        requested_by_email: user?.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selfAccessRequests', patient.id] });
      toast.success('Your request has been submitted for review');
      setRequestOpen(false);
      setForm({ target_org_id: '', access_level: 'read_only', reason: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const otherOrgs = allOrgs.filter(o => o.id !== patient.organization_id);

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <UserCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-900 text-sm">Your Care Record — You're in Control</p>
          <p className="text-xs text-green-700 mt-1">
            You can request to share your health records with any clinic in our network. This helps provide continuity of care when you visit different clinics.
          </p>
        </div>
      </div>

      {activeAccess.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-teal-700">
              <ShieldCheck className="w-4 h-4" /> Currently Shared With
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAccess.map(a => {
              const levelInfo = getLevelInfo(a.access_level);
              return (
                <div key={a.id} className="flex items-center gap-3 p-2 bg-teal-50 rounded-lg text-sm">
                  <Building2 className="w-4 h-4 text-teal-500" />
                  <span className="font-medium">{a.granted_org_name}</span>
                  <Badge variant="outline" className={`text-xs ml-auto ${levelInfo?.color}`}>{levelInfo?.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" /> My Sharing Requests
          </CardTitle>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setRequestOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Request Sharing
          </Button>
        </CardHeader>
        <CardContent>
          {selfRequests.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <UserCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No sharing requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selfRequests.map(req => (
                <div key={req.id} className="border rounded-lg p-3 text-sm">
                  <p className="font-medium text-slate-800">{req.target_org_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-xs ${{ pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-500' }[req.status]}`}>
                      {req.status}
                    </Badge>
                    <span className="text-xs text-slate-400">{format(new Date(req.created_date), 'dd MMM yyyy')}</span>
                  </div>
                  {req.review_notes && <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded">{req.review_notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600" /> Share My Records
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Which clinic should access your records? *</Label>
              <Select value={form.target_org_id} onValueChange={v => setForm({ ...form, target_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select clinic..." /></SelectTrigger>
                <SelectContent>
                  {otherOrgs.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>What can they see? *</Label>
              <Select value={form.access_level} onValueChange={v => setForm({ ...form, access_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Why are you sharing? *</Label>
              <Textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. I am visiting this clinic for specialist treatment..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700" disabled={requestMutation.isPending}
                onClick={() => requestMutation.mutate()}>
                {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function PatientCareAccessManager({ patient, currentOrgId, currentOrgName }) {
  const queryClient = useQueryClient();
  const { isPlatformOwner } = useOrganization();

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

  const isAdmin = user?.role === 'admin';
  const isPlatOwner = isPlatformOwner ||
    user?.email === 'mmylvaganam@premierhealthcanada.ca' ||
    user?.email === 'mylvaganam@premierhealthcanada.ca';

  if (isPlatOwner) {
    return <PlatformOwnerView patient={patient} allOrgs={allOrgs} accessList={accessList} user={user} queryClient={queryClient} />;
  }

  if (isAdmin) {
    return <OrgAdminView patient={patient} allOrgs={allOrgs} accessList={accessList} currentOrgId={currentOrgId} currentOrgName={currentOrgName} user={user} />;
  }

  // Regular staff / patient view
  return <PatientSelfView patient={patient} allOrgs={allOrgs} accessList={accessList} user={user} queryClient={queryClient} />;
}