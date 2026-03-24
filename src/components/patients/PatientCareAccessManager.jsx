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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Network, Plus, ShieldCheck, ShieldOff, Clock, Building2,
  AlertTriangle, CheckCircle2, Eye, Stethoscope, FlaskConical, Pill,
  Send, Crown, User, GitMerge, Check, X, Info
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCESS_LEVELS = [
  { value: 'read_only', label: 'Read Only (Basic Profile)', icon: Eye, color: 'bg-blue-100 text-blue-700' },
  { value: 'full_chart', label: 'Full Chart Access', icon: Stethoscope, color: 'bg-teal-100 text-teal-700' },
  { value: 'labs_only', label: 'Labs & Diagnostics Only', icon: FlaskConical, color: 'bg-purple-100 text-purple-700' },
  { value: 'medications_only', label: 'Medications Only', icon: Pill, color: 'bg-green-100 text-green-700' },
];

const getLevelInfo = (val) => ACCESS_LEVELS.find(l => l.value === val) || ACCESS_LEVELS[0];

// ─── Platform Owner View ─────────────────────────────────────────────────────
function PlatformOwnerView({ patient, allOrgs, accessList, queryClient, user }) {
  const [grantOpen, setGrantOpen] = useState(false);
  const [form, setForm] = useState({
    granted_org_id: '', home_org_id: '', access_level: 'read_only',
    reason: '', consent_obtained: false, consent_notes: '', expires_at: '',
  });

  // Find all orgs where this patient is registered (by patient_id across all orgs)
  const { data: patientDuplicates = [] } = useQuery({
    queryKey: ['patientDuplicates', patient.id, patient.phn],
    queryFn: async () => {
      if (!patient.phn) return [];
      return base44.entities.Patient.filter({ phn: patient.phn });
    },
    enabled: !!patient.phn,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['patientAccessRequests', patient.id],
    queryFn: () => base44.entities.PatientAccessRequest.filter({ patient_id: patient.id }, '-created_date'),
    enabled: !!patient.id,
  });

  const activeAccess = accessList.filter(a => a.status === 'active');
  const revokedAccess = accessList.filter(a => a.status !== 'active');

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!form.granted_org_id) throw new Error('Select target organization');
      if (!form.home_org_id) throw new Error('Select source (home) organization');
      if (!form.reason) throw new Error('Reason is required');

      const grantedOrg = allOrgs.find(o => o.id === form.granted_org_id);
      const homeOrg = allOrgs.find(o => o.id === form.home_org_id);

      await base44.entities.PatientCareAccess.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        home_org_id: form.home_org_id,
        home_org_name: homeOrg?.name || '',
        granted_org_id: form.granted_org_id,
        granted_org_name: grantedOrg?.name || '',
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

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        module: 'CARE_ACCESS',
        action: 'platform_grant_access',
        record_type: 'PatientCareAccess',
        metadata: { granted_to: grantedOrg?.name, access_level: form.access_level }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Access granted by platform');
      setGrantOpen(false);
      setForm({ granted_org_id: '', home_org_id: '', access_level: 'read_only', reason: '', consent_obtained: false, consent_notes: '', expires_at: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (accessId) => base44.entities.PatientCareAccess.update(accessId, {
      status: 'revoked', revoked_by: user?.email, revoked_at: new Date().toISOString(), revoke_reason: 'Revoked by platform owner',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Access revoked');
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (req) => {
      const grantedOrg = allOrgs.find(o => o.id === req.requesting_org_id);
      const homeOrg = allOrgs.find(o => o.id === req.target_org_id);
      await base44.entities.PatientCareAccess.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        home_org_id: req.target_org_id,
        home_org_name: homeOrg?.name || req.target_org_name,
        granted_org_id: req.requesting_org_id,
        granted_org_name: grantedOrg?.name || req.requesting_org_name,
        access_level: req.access_level,
        reason: req.reason,
        consent_obtained: true,
        status: 'active',
        granted_by: user?.email,
        granted_by_email: user?.email,
        granted_at: new Date().toISOString(),
        expires_at: req.expires_at || null,
      });
      await base44.entities.PatientAccessRequest.update(req.id, {
        status: 'approved', reviewed_by_email: user?.email, reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patientAccessRequests', patient.id] });
      toast.success('Request approved & access granted');
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (reqId) => base44.entities.PatientAccessRequest.update(reqId, {
      status: 'rejected', reviewed_by_email: user?.email, reviewed_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAccessRequests', patient.id] });
      toast.success('Request rejected');
    },
  });

  const pendingOnly = pendingRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-3">
        <Crown className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-purple-900 text-sm">Platform Owner — Cross-Clinic Access Control</p>
          <p className="text-xs text-purple-700 mt-0.5">
            You can see all organizations where this patient exists, approve access requests from orgs, and directly grant access between any two clinics.
          </p>
        </div>
      </div>

      <Tabs defaultValue="access">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="access">Active Access ({activeAccess.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Requests {pendingOnly.length > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs border-0">{pendingOnly.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="registrations">Registrations ({patientDuplicates.length})</TabsTrigger>
        </TabsList>

        {/* Active Access Tab */}
        <TabsContent value="access" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setGrantOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Grant Access
            </Button>
          </div>
          {activeAccess.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg text-slate-400">
              <Network className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No active cross-clinic access grants</p>
            </div>
          ) : (
            activeAccess.map(access => {
              const lvl = getLevelInfo(access.access_level);
              const LvlIcon = lvl.icon;
              return (
                <div key={access.id} className="border rounded-lg p-4 bg-white flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900">{access.granted_org_name}</p>
                      <p className="text-xs text-slate-500">Home: {access.home_org_name}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${lvl.color}`}>
                          <LvlIcon className="w-3 h-3 mr-1" />{lvl.label}
                        </Badge>
                        {access.consent_obtained && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />Consent ✓
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{access.reason}</p>
                      <p className="text-xs text-slate-400">
                        Granted by {access.granted_by_email} · {format(new Date(access.granted_at), 'MMM d, yyyy')}
                        {access.expires_at && ` · Expires ${format(new Date(access.expires_at), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                    onClick={() => revokeMutation.mutate(access.id)} disabled={revokeMutation.isPending}>
                    <ShieldOff className="w-4 h-4 mr-1" />Revoke
                  </Button>
                </div>
              );
            })
          )}
          {revokedAccess.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-slate-500 mb-2">Revoked / Expired History</p>
              {revokedAccess.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded mb-1">
                  <span className="text-slate-600">{a.granted_org_name} — {getLevelInfo(a.access_level)?.label}</span>
                  <span className="text-slate-400">{a.revoked_at ? `Revoked ${format(new Date(a.revoked_at), 'MMM d, yyyy')}` : 'Expired'}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="requests" className="space-y-3 mt-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg text-slate-400">
              <Send className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No access requests</p>
            </div>
          ) : (
            pendingRequests.map(req => (
              <div key={req.id} className={`border rounded-lg p-4 ${req.status === 'pending' ? 'border-amber-200 bg-amber-50' : 'bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={req.status === 'pending' ? 'bg-amber-500 text-white border-0' : req.status === 'approved' ? 'bg-green-600 text-white border-0' : 'bg-red-500 text-white border-0'}>
                        {req.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {req.request_type === 'patient_self' ? '👤 Patient Request' : '🏥 Org Request'}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {req.request_type === 'patient_self'
                        ? `Patient requesting access from ${req.target_org_name}`
                        : `${req.requesting_org_name} → ${req.target_org_name}`}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{req.reason}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {getLevelInfo(req.access_level)?.label} · by {req.requested_by_email}
                    </p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approveRequestMutation.mutate(req)} disabled={approveRequestMutation.isPending}>
                        <Check className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => rejectRequestMutation.mutate(req.id)} disabled={rejectRequestMutation.isPending}>
                        <X className="w-4 h-4 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Registrations Tab */}
        <TabsContent value="registrations" className="space-y-3 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              These are all organizations where a patient with PHN <strong>{patient.phn || 'N/A'}</strong> is registered across the platform.
              You can grant access between any of these orgs.
            </p>
          </div>
          {patientDuplicates.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No other registrations found (patient has no PHN or is registered only here)</p>
          ) : (
            patientDuplicates.map(p => {
              const org = allOrgs.find(o => o.id === p.organization_id);
              return (
                <div key={p.id} className="border rounded-lg p-4 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{org?.name || p.organization_id}</p>
                      <p className="text-xs text-slate-500">PHN: {p.phn} · Status: {p.status}</p>
                    </div>
                  </div>
                  {org && (
                    <Badge variant="outline" className="capitalize">{org.type}</Badge>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Grant Access Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              Platform: Grant Care Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Patient's Home / Source Org *</Label>
              <Select value={form.home_org_id} onValueChange={v => setForm({ ...form, home_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Where the record lives..." /></SelectTrigger>
                <SelectContent>
                  {allOrgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grant Access To (Target Org) *</Label>
              <Select value={form.granted_org_id} onValueChange={v => setForm({ ...form, granted_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Clinic/hospital receiving access..." /></SelectTrigger>
                <SelectContent>
                  {allOrgs.filter(o => o.id !== form.home_org_id).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
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
              <Textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Specialist referral, emergency transfer..." />
            </div>
            <div>
              <Label>Expires On (optional)</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">Patient Consent Confirmed</p>
                <p className="text-xs text-slate-500">Patient has consented to this sharing</p>
              </div>
              <Switch checked={form.consent_obtained} onCheckedChange={v => setForm({ ...form, consent_obtained: v })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
              <Button className="bg-purple-600 hover:bg-purple-700" disabled={grantMutation.isPending} onClick={() => grantMutation.mutate()}>
                {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Org Admin View ───────────────────────────────────────────────────────────
function OrgAdminView({ patient, currentOrgId, currentOrgName, allOrgs, accessList, queryClient, user }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ target_org_id: '', access_level: 'read_only', reason: '', expires_at: '' });
  const [grantForm, setGrantForm] = useState({ granted_org_id: '', access_level: 'read_only', reason: '', consent_obtained: false, consent_notes: '', expires_at: '' });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myAccessRequests', patient.id, currentOrgId],
    queryFn: () => base44.entities.PatientAccessRequest.filter({ patient_id: patient.id, requesting_org_id: currentOrgId }, '-created_date'),
    enabled: !!patient.id,
  });

  const activeAccess = accessList.filter(a => a.status === 'active' && (a.home_org_id === currentOrgId || a.granted_org_id === currentOrgId));

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!reqForm.target_org_id) throw new Error('Select target organization');
      if (!reqForm.reason) throw new Error('Reason is required');
      const targetOrg = allOrgs.find(o => o.id === reqForm.target_org_id);
      await base44.entities.PatientAccessRequest.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        request_type: 'org_to_org',
        requesting_org_id: currentOrgId,
        requesting_org_name: currentOrgName,
        target_org_id: reqForm.target_org_id,
        target_org_name: targetOrg?.name || '',
        access_level: reqForm.access_level,
        reason: reqForm.reason,
        expires_at: reqForm.expires_at || null,
        status: 'pending',
        requested_by_email: user?.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAccessRequests', patient.id, currentOrgId] });
      toast.success('Access request submitted — awaiting platform approval');
      setRequestOpen(false);
      setReqForm({ target_org_id: '', access_level: 'read_only', reason: '', expires_at: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!grantForm.granted_org_id) throw new Error('Select target organization');
      if (!grantForm.reason) throw new Error('Reason is required');
      if (!grantForm.consent_obtained) throw new Error('Patient consent must be confirmed');
      const org = allOrgs.find(o => o.id === grantForm.granted_org_id);
      await base44.entities.PatientCareAccess.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        home_org_id: currentOrgId,
        home_org_name: currentOrgName,
        granted_org_id: grantForm.granted_org_id,
        granted_org_name: org?.name || '',
        access_level: grantForm.access_level,
        reason: grantForm.reason,
        consent_obtained: grantForm.consent_obtained,
        consent_notes: grantForm.consent_notes,
        expires_at: grantForm.expires_at || null,
        status: 'active',
        granted_by: user?.id,
        granted_by_email: user?.email,
        granted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Access granted');
      setGrantOpen(false);
      setGrantForm({ granted_org_id: '', access_level: 'read_only', reason: '', consent_obtained: false, consent_notes: '', expires_at: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (accessId) => base44.entities.PatientCareAccess.update(accessId, {
      status: 'revoked', revoked_by: user?.email, revoked_at: new Date().toISOString(), revoke_reason: 'Revoked by org admin',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCareAccess', patient.id] });
      toast.success('Access revoked');
    },
  });

  const otherOrgs = allOrgs.filter(o => o.id !== currentOrgId);

  return (
    <div className="space-y-4">
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-start gap-3">
        <Network className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-teal-900 text-sm">Cross-Clinic Care Network</p>
          <p className="text-xs text-teal-700 mt-0.5">
            Share this patient's record with another clinic (patient consent required) or request access to their record at another clinic (requires platform approval).
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setGrantOpen(true)}>
          <ShieldCheck className="w-4 h-4 mr-1" /> Share Record with Another Clinic
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
          <Send className="w-4 h-4 mr-1" /> Request Access from Another Clinic
        </Button>
      </div>

      {/* Active Access */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Active Access Grants ({activeAccess.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAccess.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No active access grants for this organization</p>
          ) : (
            <div className="space-y-3">
              {activeAccess.map(access => {
                const lvl = getLevelInfo(access.access_level);
                const LvlIcon = lvl.icon;
                const canRevoke = access.home_org_id === currentOrgId;
                return (
                  <div key={access.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-teal-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {access.home_org_id === currentOrgId
                            ? `Shared with: ${access.granted_org_name}`
                            : `Access from: ${access.home_org_name}`}
                        </p>
                        <Badge variant="outline" className={`text-xs mt-1 ${lvl.color}`}>
                          <LvlIcon className="w-3 h-3 mr-1" />{lvl.label}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">{access.reason}</p>
                      </div>
                    </div>
                    {canRevoke && (
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                        onClick={() => revokeMutation.mutate(access.id)}>
                        <ShieldOff className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Requests */}
      {myRequests.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              My Access Requests ({myRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myRequests.map(req => (
                <div key={req.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">→ {req.target_org_name}</p>
                    <p className="text-xs text-slate-500">{req.reason} · {getLevelInfo(req.access_level)?.label}</p>
                  </div>
                  <Badge className={
                    req.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                    req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                    'bg-red-100 text-red-700 border-red-300'
                  }>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Access Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Request Access from Another Clinic
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">This request will be reviewed by the platform owner before access is granted.</p>
            </div>
            <div>
              <Label>Target Clinic / Hospital *</Label>
              <Select value={reqForm.target_org_id} onValueChange={v => setReqForm({ ...reqForm, target_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select clinic that has the patient record..." /></SelectTrigger>
                <SelectContent>
                  {otherOrgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Level Requested *</Label>
              <Select value={reqForm.access_level} onValueChange={v => setReqForm({ ...reqForm, access_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea rows={2} value={reqForm.reason} onChange={e => setReqForm({ ...reqForm, reason: e.target.value })} placeholder="e.g. Patient referred from this clinic, needs continuity of care..." />
            </div>
            <div>
              <Label>Access Expiry (optional)</Label>
              <Input type="date" value={reqForm.expires_at} onChange={e => setReqForm({ ...reqForm, expires_at: e.target.value })} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button disabled={requestMutation.isPending} onClick={() => requestMutation.mutate()}>
                {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Share Patient Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800"><strong>Patient consent required</strong> before sharing their medical record.</p>
            </div>
            <div>
              <Label>Share With Clinic *</Label>
              <Select value={grantForm.granted_org_id} onValueChange={v => setGrantForm({ ...grantForm, granted_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select target clinic..." /></SelectTrigger>
                <SelectContent>
                  {otherOrgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Level *</Label>
              <Select value={grantForm.access_level} onValueChange={v => setGrantForm({ ...grantForm, access_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea rows={2} value={grantForm.reason} onChange={e => setGrantForm({ ...grantForm, reason: e.target.value })} placeholder="e.g. Referral to specialist, emergency care..." />
            </div>
            <div>
              <Label>Expires On (optional)</Label>
              <Input type="date" value={grantForm.expires_at} onChange={e => setGrantForm({ ...grantForm, expires_at: e.target.value })} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Patient Consent Confirmed *</p>
                  <p className="text-xs text-slate-500">Patient has verbally or in writing consented</p>
                </div>
                <Switch checked={grantForm.consent_obtained} onCheckedChange={v => setGrantForm({ ...grantForm, consent_obtained: v })} />
              </div>
              {grantForm.consent_obtained && (
                <Textarea className="mt-2" rows={2} value={grantForm.consent_notes} onChange={e => setGrantForm({ ...grantForm, consent_notes: e.target.value })} placeholder="How was consent obtained?" />
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" disabled={grantMutation.isPending} onClick={() => grantMutation.mutate()}>
                {grantMutation.isPending ? 'Sharing...' : 'Share Record'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Patient/General View ─────────────────────────────────────────────────────
function PatientView({ patient, allOrgs, accessList, queryClient, user, currentOrgId }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ target_org_id: '', access_level: 'read_only', reason: '' });
  const activeAccess = accessList.filter(a => a.status === 'active');

  const { data: myRequests = [] } = useQuery({
    queryKey: ['patientSelfRequests', patient.id],
    queryFn: () => base44.entities.PatientAccessRequest.filter({ patient_id: patient.id, request_type: 'patient_self' }, '-created_date'),
    enabled: !!patient.id,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!reqForm.target_org_id) throw new Error('Select an organization');
      if (!reqForm.reason) throw new Error('Please provide a reason');
      const targetOrg = allOrgs.find(o => o.id === reqForm.target_org_id);
      await base44.entities.PatientAccessRequest.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phn: patient.phn || '',
        request_type: 'patient_self',
        requesting_org_id: currentOrgId,
        requesting_org_name: '',
        target_org_id: reqForm.target_org_id,
        target_org_name: targetOrg?.name || '',
        access_level: reqForm.access_level,
        reason: reqForm.reason,
        status: 'pending',
        requested_by_email: user?.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientSelfRequests', patient.id] });
      toast.success('Request submitted for platform review');
      setRequestOpen(false);
      setReqForm({ target_org_id: '', access_level: 'read_only', reason: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-900 text-sm">Your Health Record Sharing</p>
          <p className="text-xs text-blue-700 mt-1">
            You can see which clinics have access to your medical record, and request your record to be shared with another clinic.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setRequestOpen(true)}>
          <Send className="w-4 h-4 mr-1" /> Request Record Sharing
        </Button>
      </div>

      {/* Current Access */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Clinics With Access to Your Record ({activeAccess.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAccess.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Your record is not currently shared with any other clinic.</p>
          ) : (
            <div className="space-y-2">
              {activeAccess.map(access => {
                const lvl = getLevelInfo(access.access_level);
                const LvlIcon = lvl.icon;
                return (
                  <div key={access.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{access.granted_org_name}</p>
                        <Badge variant="outline" className={`text-xs ${lvl.color}`}>
                          <LvlIcon className="w-3 h-3 mr-1" />{lvl.label}
                        </Badge>
                      </div>
                    </div>
                    {access.expires_at && (
                      <p className="text-xs text-slate-400">Expires {format(new Date(access.expires_at), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Requests */}
      {myRequests.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">My Sharing Requests ({myRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">→ {req.target_org_name}</p>
                    <p className="text-xs text-slate-500">{req.reason}</p>
                  </div>
                  <Badge className={
                    req.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                    req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                    'bg-red-100 text-red-700 border-red-300'
                  }>{req.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Self Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Request Your Record Sharing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">Your request will be reviewed by the platform administrator. You will be notified when access is granted.</p>
            </div>
            <div>
              <Label>Share With Clinic *</Label>
              <Select value={reqForm.target_org_id} onValueChange={v => setReqForm({ ...reqForm, target_org_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select clinic..." /></SelectTrigger>
                <SelectContent>
                  {allOrgs.filter(o => o.id !== currentOrgId).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Level</Label>
              <Select value={reqForm.access_level} onValueChange={v => setReqForm({ ...reqForm, access_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea rows={2} value={reqForm.reason} onChange={e => setReqForm({ ...reqForm, reason: e.target.value })} placeholder="e.g. Visiting specialist at this clinic, ongoing treatment..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button disabled={requestMutation.isPending} onClick={() => requestMutation.mutate()}>
                {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PatientCareAccessManager({ patient, currentOrgId, currentOrgName, isAdmin }) {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const isPlatformOwner = user?.email === 'mmylvaganam@premierhealthcanada.ca' ||
    user?.email === 'mylvaganam@premierhealthcanada.ca' ||
    user?.is_platform_owner === true;

  const { data: allOrgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.filter({ status: 'active' }),
  });

  const { data: accessList = [] } = useQuery({
    queryKey: ['patientCareAccess', patient.id],
    queryFn: () => base44.entities.PatientCareAccess.filter({ patient_id: patient.id }, '-granted_at'),
    enabled: !!patient.id,
  });

  if (isPlatformOwner) {
    return <PlatformOwnerView patient={patient} allOrgs={allOrgs} accessList={accessList} queryClient={queryClient} user={user} />;
  }

  if (isAdmin) {
    return <OrgAdminView patient={patient} currentOrgId={currentOrgId} currentOrgName={currentOrgName} allOrgs={allOrgs} accessList={accessList} queryClient={queryClient} user={user} />;
  }

  return <PatientView patient={patient} allOrgs={allOrgs} accessList={accessList} queryClient={queryClient} user={user} currentOrgId={currentOrgId} />;
}