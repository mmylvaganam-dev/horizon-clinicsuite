import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Network, CheckCircle2, XCircle, Hourglass, Building2, User,
  AlertTriangle, Eye, Stethoscope, FlaskConical, Pill, ShieldCheck, Send, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCESS_LEVELS = {
  read_only: { label: 'Read Only', color: 'bg-blue-100 text-blue-700', icon: Eye },
  full_chart: { label: 'Full Chart', color: 'bg-teal-100 text-teal-700', icon: Stethoscope },
  labs_only: { label: 'Labs Only', color: 'bg-purple-100 text-purple-700', icon: FlaskConical },
  medications_only: { label: 'Medications Only', color: 'bg-green-100 text-green-700', icon: Pill },
};

export default function PatientAccessRequests() {
  const queryClient = useQueryClient();
  const { isPlatformOwner } = useOrganization();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [overrideLevel, setOverrideLevel] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isPlatOwner = isPlatformOwner ||
    user?.email === 'mmylvaganam@premierhealthcanada.ca' ||
    user?.email === 'mylvaganam@premierhealthcanada.ca';

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['allPatientAccessRequests'],
    queryFn: () => base44.entities.PatientAccessRequest.list('-created_date'),
    enabled: isPlatOwner,
  });

  const { data: allOrgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.filter({ status: 'active' }),
    enabled: isPlatOwner,
  });

  const pending = allRequests.filter(r => r.status === 'pending');
  const reviewed = allRequests.filter(r => r.status !== 'pending');

  const openReview = (req) => {
    setSelectedReq(req);
    setReviewNotes('');
    setOverrideLevel(req.access_level);
    setReviewOpen(true);
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      const req = selectedReq;
      const org = allOrgs.find(o => o.id === req.requesting_org_id);
      const targetOrg = allOrgs.find(o => o.id === req.target_org_id);

      // Find the patient at the target org
      let patientAtTarget = null;
      if (req.patient_phn) {
        const patients = await base44.entities.Patient.filter({ phn: req.patient_phn, organization_id: req.target_org_id });
        patientAtTarget = patients[0];
      }

      // Create the actual access grant
      await base44.entities.PatientCareAccess.create({
        patient_id: req.patient_id,
        patient_name: req.patient_name,
        patient_phn: req.patient_phn || '',
        home_org_id: req.target_org_id,
        home_org_name: targetOrg?.name || req.target_org_name,
        granted_org_id: req.requesting_org_id,
        granted_org_name: org?.name || req.requesting_org_name,
        access_level: overrideLevel || req.access_level,
        reason: `Approved request: ${req.reason}`,
        consent_obtained: req.request_type === 'patient_self',
        consent_notes: req.request_type === 'patient_self' ? 'Patient self-requested via portal' : '',
        status: 'active',
        granted_by: user?.id,
        granted_by_email: user?.email,
        granted_at: new Date().toISOString(),
      });

      // Update request status
      await base44.entities.PatientAccessRequest.update(req.id, {
        status: 'approved',
        reviewed_by_email: user?.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPatientAccessRequests'] });
      toast.success('Request approved — access granted');
      setReviewOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.PatientAccessRequest.update(selectedReq.id, {
        status: 'rejected',
        reviewed_by_email: user?.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPatientAccessRequests'] });
      toast.success('Request rejected');
      setReviewOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const statusBadge = (status) => {
    const map = {
      pending: { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: Hourglass, label: 'Pending' },
      approved: { cls: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Approved' },
      rejected: { cls: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' },
      cancelled: { cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: XCircle, label: 'Cancelled' },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return <Badge variant="outline" className={`text-xs ${s.cls}`}><Icon className="w-3 h-3 mr-1" />{s.label}</Badge>;
  };

  const typeIcon = (type) => type === 'patient_self'
    ? <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200"><UserCheck className="w-3 h-3 mr-1" />Patient Self-Request</Badge>
    : <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200"><Building2 className="w-3 h-3 mr-1" />Org Request</Badge>;

  if (!isPlatOwner) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-4" />
        <h2 className="text-lg font-semibold text-slate-800">Platform Owner Access Only</h2>
        <p className="text-sm text-slate-500 mt-2">Only the platform owner can review patient access requests.</p>
      </div>
    );
  }

  const RequestCard = ({ req }) => {
    const levelInfo = ACCESS_LEVELS[req.access_level];
    const LevelIcon = levelInfo?.icon || Eye;
    return (
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              {req.request_type === 'patient_self' ? <User className="w-5 h-5 text-green-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{req.patient_name}</p>
                {req.patient_phn && <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">PHN: {req.patient_phn}</Badge>}
                {statusBadge(req.status)}
                {typeIcon(req.request_type)}
              </div>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                {req.request_type === 'org_to_org' ? (
                  <p><span className="font-medium text-blue-700">{req.requesting_org_name}</span> → requesting access from → <span className="font-medium text-slate-700">{req.target_org_name}</span></p>
                ) : (
                  <p>Patient requests their records be shared with <span className="font-medium text-green-700">{req.target_org_name}</span></p>
                )}
                <div className="flex items-center gap-1">
                  <LevelIcon className="w-3 h-3" />
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${levelInfo?.color}`}>{levelInfo?.label}</span>
                </div>
                <p className="text-slate-500 italic">"{req.reason}"</p>
                <p className="text-slate-400">
                  Submitted by {req.requested_by_email} · {format(new Date(req.created_date), 'dd MMM yyyy HH:mm')}
                  {req.reviewed_at && ` · Reviewed ${format(new Date(req.reviewed_at), 'dd MMM yyyy')}`}
                </p>
                {req.review_notes && (
                  <p className="bg-slate-50 p-2 rounded border text-slate-600"><strong>Review note:</strong> {req.review_notes}</p>
                )}
              </div>
            </div>
          </div>
          {req.status === 'pending' && (
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 flex-shrink-0" onClick={() => openReview(req)}>
              Review
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
          <Network className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Access Requests</h1>
          <p className="text-sm text-slate-500">Review and approve cross-clinic patient record access requests</p>
        </div>
        {pending.length > 0 && (
          <Badge className="ml-auto bg-amber-500 text-white border-0 text-sm px-3 py-1">
            {pending.length} Pending
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading requests...</div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending {pending.length > 0 && <Badge className="ml-1 bg-amber-100 text-amber-700 border-0">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="text-center py-16">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-3" />
                  <p className="font-medium text-slate-700">All caught up!</p>
                  <p className="text-sm text-slate-500 mt-1">No pending patient access requests.</p>
                </CardContent>
              </Card>
            ) : (
              pending.map(req => <RequestCard key={req.id} req={req} />)
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-3 mt-4">
            {reviewed.length === 0 ? (
              <Card>
                <CardContent className="text-center py-16">
                  <p className="text-slate-500">No reviewed requests yet.</p>
                </CardContent>
              </Card>
            ) : (
              reviewed.map(req => <RequestCard key={req.id} req={req} />)
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Review Dialog */}
      {selectedReq && (
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" /> Review Access Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                <p><span className="text-slate-500">Patient:</span> <strong>{selectedReq.patient_name}</strong> {selectedReq.patient_phn && `(PHN: ${selectedReq.patient_phn})`}</p>
                {selectedReq.request_type === 'org_to_org' ? (
                  <p><span className="text-slate-500">Requesting org:</span> <strong className="text-blue-700">{selectedReq.requesting_org_name}</strong></p>
                ) : (
                  <p className="text-green-700 font-medium">Patient initiated this request themselves</p>
                )}
                <p><span className="text-slate-500">Target org (who holds the records):</span> <strong>{selectedReq.target_org_name}</strong></p>
                <p><span className="text-slate-500">Reason:</span> {selectedReq.reason}</p>
              </div>

              <div>
                <Label>Access Level to Grant</Label>
                <Select value={overrideLevel} onValueChange={setOverrideLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCESS_LEVELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 mt-1">You can override the requested level before approving</p>
              </div>

              <div>
                <Label>Review Notes (optional)</Label>
                <Textarea rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Notes for the requester..." />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Approving</strong> will immediately create an active care access grant. Ensure patient consent has been obtained.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </Button>
                <Button className="bg-teal-600 hover:bg-teal-700"
                  disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                  {approveMutation.isPending ? 'Approving...' : 'Approve & Grant Access'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}