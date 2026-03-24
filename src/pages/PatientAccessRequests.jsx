import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Network, Check, X, Search, User, Building2, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCESS_LEVELS = [
  { value: 'read_only', label: 'Read Only' },
  { value: 'full_chart', label: 'Full Chart' },
  { value: 'labs_only', label: 'Labs Only' },
  { value: 'medications_only', label: 'Medications Only' },
];

export default function PatientAccessRequests() {
  const queryClient = useQueryClient();
  const { isPlatformOwner } = useOrganization();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: allOrgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.filter({ status: 'active' }),
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['allAccessRequests', statusFilter],
    queryFn: () => statusFilter === 'all'
      ? base44.entities.PatientAccessRequest.list('-created_date', 100)
      : base44.entities.PatientAccessRequest.filter({ status: statusFilter }, '-created_date', 100),
  });

  const filtered = requests.filter(r =>
    !search ||
    r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.patient_phn?.toLowerCase().includes(search.toLowerCase()) ||
    r.requesting_org_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.target_org_name?.toLowerCase().includes(search.toLowerCase())
  );

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      const grantedOrg = allOrgs.find(o => o.id === req.requesting_org_id);
      const homeOrg = allOrgs.find(o => o.id === req.target_org_id);
      await base44.entities.PatientCareAccess.create({
        patient_id: req.patient_id,
        patient_name: req.patient_name,
        patient_phn: req.patient_phn,
        home_org_id: req.target_org_id,
        home_org_name: homeOrg?.name || req.target_org_name,
        granted_org_id: req.requesting_org_id || req.target_org_id,
        granted_org_name: grantedOrg?.name || req.requesting_org_name || req.target_org_name,
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
        status: 'approved',
        reviewed_by_email: user?.email,
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAccessRequests'] });
      toast.success('Request approved & access granted');
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reqId) => base44.entities.PatientAccessRequest.update(reqId, {
      status: 'rejected',
      reviewed_by_email: user?.email,
      reviewed_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAccessRequests'] });
      toast.success('Request rejected');
    },
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (!isPlatformOwner && user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Network className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Access Restricted</h3>
        <p className="text-slate-500 mt-2">Only platform owners can manage cross-clinic access requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Network className="w-6 h-6 text-teal-600" />
          Patient Access Requests
        </h1>
        <p className="text-slate-500 mt-1">Review and approve cross-clinic patient record sharing requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: requests.filter(r => r.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total', value: requests.length, color: 'text-slate-700', bg: 'bg-slate-50' },
        ].map(stat => (
          <Card key={stat.label} className={`${stat.bg} border-0`}>
            <CardContent className="pt-4 pb-3">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-slate-600">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search patient, org..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-slate-500 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-white border-0 shadow-sm">
            <Send className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No requests found</h3>
            <p className="text-slate-500 mt-1">No access requests match your filter</p>
          </Card>
        ) : (
          filtered.map(req => (
            <Card key={req.id} className={`bg-white border-0 shadow-sm overflow-hidden ${req.status === 'pending' ? 'border-l-4 border-l-amber-400' : req.status === 'approved' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-400'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                        req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                        'bg-red-100 text-red-700 border-red-300'
                      }>{req.status}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {req.request_type === 'patient_self' ? '👤 Patient Request' : '🏥 Org Request'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ACCESS_LEVELS.find(l => l.value === req.access_level)?.label || req.access_level}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-900">{req.patient_name}</span>
                        {req.patient_phn && <span className="text-xs text-slate-500 ml-2">PHN: {req.patient_phn}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      {req.request_type === 'patient_self'
                        ? <span>Patient requests access at: <strong>{req.target_org_name}</strong></span>
                        : <span><strong>{req.requesting_org_name}</strong> → <strong>{req.target_org_name}</strong></span>
                      }
                    </div>

                    <p className="text-sm text-slate-600 bg-slate-50 rounded p-2">{req.reason}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {req.created_date ? format(new Date(req.created_date), 'MMM d, yyyy HH:mm') : 'N/A'}
                      </span>
                      <span>by {req.requested_by_email}</span>
                      {req.expires_at && <span>Expires: {format(new Date(req.expires_at), 'MMM d, yyyy')}</span>}
                      {req.reviewed_by_email && <span>Reviewed by {req.reviewed_by_email}</span>}
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approveMutation.mutate(req)} disabled={approveMutation.isPending}>
                        <Check className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => rejectMutation.mutate(req.id)} disabled={rejectMutation.isPending}>
                        <X className="w-4 h-4 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}