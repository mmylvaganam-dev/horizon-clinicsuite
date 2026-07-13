import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, Mail, Clock, CheckCircle, XCircle, AlertTriangle, Search, UserPlus, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UnifiedUserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPlatformOwner = currentUser?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                          currentUser?.email === 'mylvaganam@premierhealthcanada.ca' || 
                          currentUser?.is_platform_owner;
  const isOrgAdmin = isPlatformOwner || currentUser?.role === 'admin';

  // Unified data fetch
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listAllUsers', {});
      return res.data?.users || [];
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  // Org admins only see their own organization; platform owner sees all
  const visibleOrganizations = isPlatformOwner
    ? organizations
    : organizations.filter(o => o.id === currentUser?.organization_id);

  const { data: approvals = [] } = useQuery({
    queryKey: ['userApprovals'],
    queryFn: async () => {
      if (isPlatformOwner) {
        return await base44.entities.UserApproval.list();
      } else if (isOrgAdmin) {
        return await base44.entities.UserApproval.filter({ organization_id: currentUser?.organization_id });
      }
      return [];
    },
    enabled: !!currentUser && (isPlatformOwner || isOrgAdmin),
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['pendingInvitations'],
    queryFn: () => base44.entities.PendingInvitation.filter({ status: 'pending' }, '-created_date'),
  });

  // Mutations
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role, orgId }) => {
      const response = await base44.functions.invoke('inviteUserToOrg', {
        email,
        role,
        organizationId: orgId
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: async () => {
      toast.success('✅ User invited successfully!');
      await queryClient.invalidateQueries(['allUsers']);
      await queryClient.invalidateQueries(['pendingInvitations']);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      setInviteOrgId('');
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  const approveUserMutation = useMutation({
    mutationFn: async (approval) => {
      await base44.entities.UserApproval.update(approval.id, {
        org_admin_status: 'approved',
        org_admin_approved_by: currentUser.email,
        org_admin_approved_date: new Date().toISOString(),
        final_status: isPlatformOwner ? 'pending_platform' : 'approved',
      });
      if (isPlatformOwner) {
        await base44.functions.invoke('assignUserToOrganization', {
          userEmail: approval.user_email,
          organizationId: approval.organization_id
        });
      }
      return approval;
    },
    onSuccess: async () => {
      toast.success('✅ User approved!');
      await queryClient.invalidateQueries(['userApprovals']);
      await queryClient.invalidateQueries(['allUsers']);
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  const rejectUserMutation = useMutation({
    mutationFn: async (approval) => {
      await base44.entities.UserApproval.update(approval.id, {
        org_admin_status: 'rejected',
        org_admin_approved_by: currentUser.email,
        org_admin_approved_date: new Date().toISOString(),
        final_status: 'rejected',
        rejection_reason: rejectionReason,
      });
    },
    onSuccess: async () => {
      toast.success('✅ User rejected!');
      await queryClient.invalidateQueries(['userApprovals']);
      setSelectedUser(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await base44.functions.invoke('deleteOrgUser', { userId });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('✅ User deleted!');
      await queryClient.invalidateQueries(['allUsers']);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      await base44.entities.PendingInvitation.update(inviteId, { status: 'cancelled' });
    },
    onSuccess: async () => {
      toast.success('✅ Invitation cancelled!');
      await queryClient.invalidateQueries(['pendingInvitations']);
    },
  });

  // Build comprehensive user view
  const userMap = new Map();
  
  // Add registered users
  allUsers.forEach(u => {
    if (!userMap.has(u.email)) {
      userMap.set(u.email, { user: u, approval: null, invitation: null });
    } else {
      userMap.get(u.email).user = u;
    }
  });

  // Add approval records
  approvals.forEach(a => {
    if (!userMap.has(a.user_email)) {
      userMap.set(a.user_email, { user: null, approval: a, invitation: null });
    } else {
      userMap.get(a.user_email).approval = a;
    }
  });

  // Add pending invitations
  pendingInvitations.forEach(i => {
    if (!userMap.has(i.email)) {
      userMap.set(i.email, { user: null, approval: null, invitation: i });
    } else {
      userMap.get(i.email).invitation = i;
    }
  });

  // Filter by search
  const filteredUsers = Array.from(userMap.values()).filter(entry => {
    const email = entry.user?.email || entry.approval?.user_email || entry.invitation?.email || '';
    const name = entry.user?.full_name || '';
    const query = searchQuery.toLowerCase();
    return email.toLowerCase().includes(query) || name.toLowerCase().includes(query);
  });

  // Categorize
  const pendingApprovals = filteredUsers.filter(e => e.approval?.final_status === 'pending_org');
  const pendingPlatform = filteredUsers.filter(e => e.approval?.final_status === 'pending_platform');
  const approved = filteredUsers.filter(e => e.approval?.final_status === 'approved' || (e.user && !e.approval));
  const pending = filteredUsers.filter(e => e.invitation?.status === 'pending');
  const rejected = filteredUsers.filter(e => e.approval?.final_status === 'rejected');

  const getOrgName = (orgId) => organizations.find(o => o.id === orgId)?.name || orgId;

  const UserEntry = ({ entry, showApproveActions, showPlatformActions }) => {
    const email = entry.user?.email || entry.approval?.user_email || entry.invitation?.email;
    const name = entry.user?.full_name || 'Pending';
    const orgId = entry.user?.organization_id || entry.approval?.organization_id;
    const approval = entry.approval;
    const invitation = entry.invitation;

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
        <div className="flex-1">
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-sm text-slate-600">{email}</p>
          {orgId && <p className="text-xs text-slate-500">Org: {getOrgName(orgId)}</p>}
          {approval && (
            <div className="text-xs text-slate-500 mt-1">
              <p>Org Admin: {approval.org_admin_status} {approval.org_admin_approved_date && `(${new Date(approval.org_admin_approved_date).toLocaleDateString()})`}</p>
              {approval.platform_owner_status && <p>Platform Owner: {approval.platform_owner_status}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {approval?.final_status === 'pending_org' && <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pending Org</Badge>}
          {approval?.final_status === 'pending_platform' && <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Pending Platform</Badge>}
          {approval?.final_status === 'approved' && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
          {approval?.final_status === 'rejected' && <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
          {invitation?.status === 'pending' && <Badge className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" /> Invite Sent</Badge>}
          {entry.user && !approval && !invitation && <Badge className="bg-green-100 text-green-800">Active</Badge>}

          <div className="flex gap-1">
            {showApproveActions && (
              <>
                <Button size="sm" variant="outline" onClick={() => approveUserMutation.mutate(approval)} className="text-green-600" disabled={approveUserMutation.isPending}>
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => setSelectedUser(approval)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Access Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                        <Button className="bg-red-600" onClick={() => rejectUserMutation.mutate(approval)}>Reject</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {invitation && (
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => cancelInviteMutation.mutate(invitation.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isPlatformOwner && !isOrgAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-600 mt-2">Only admins can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Unified view: Invitations, approvals, roles, and access</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User to Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Organization</Label>
                <Select value={inviteOrgId} onValueChange={setInviteOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleOrganizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email Address</Label>
                <Input type="email" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole, orgId: inviteOrgId })} disabled={!inviteEmail || !inviteOrgId || inviteUserMutation.isPending} className="w-full bg-teal-600">
                {inviteUserMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by email or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Users</p>
            <p className="text-2xl font-bold">{allUsers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Pending Org Approval</p>
            <p className="text-2xl font-bold text-amber-600">{pendingApprovals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Pending Platform</p>
            <p className="text-2xl font-bold text-blue-600">{pendingPlatform.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Invites Sent</p>
            <p className="text-2xl font-bold text-blue-600">{pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Active Users</p>
            <p className="text-2xl font-bold text-green-600">{approved.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-900">📧 Pending Invitations ({pending.length})</CardTitle>
            <CardDescription>Invites sent, awaiting acceptance</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {pending.map(e => <UserEntry key={e.invitation.id} entry={e} />)}
          </CardContent>
        </Card>
      )}

      {/* Pending Org Approval */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-amber-900">⏳ Pending Organization Approval ({pendingApprovals.length})</CardTitle>
            <CardDescription>{isOrgAdmin ? 'Users requesting access to your organization' : 'Users waiting for org admin approval'}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {pendingApprovals.map(e => <UserEntry key={e.approval.id} entry={e} showApproveActions={isOrgAdmin} />)}
          </CardContent>
        </Card>
      )}

      {/* Pending Platform Approval */}
      {isPlatformOwner && pendingPlatform.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex gap-2"><AlertTriangle className="w-5 h-5 animate-pulse" /> Pending Your Final Approval ({pendingPlatform.length})</CardTitle>
            <CardDescription className="text-red-700">Org admin approved, awaiting your final platform owner sign-off</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {pendingPlatform.map(e => <UserEntry key={e.approval.id} entry={e} showPlatformActions={true} />)}
          </CardContent>
        </Card>
      )}

      {/* Approved Users */}
      {approved.length > 0 && (
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-900">✅ Active Users ({approved.length})</CardTitle>
            <CardDescription>Users with full access</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {approved.map(e => <UserEntry key={e.user?.id || e.approval?.id} entry={e} />)}
          </CardContent>
        </Card>
      )}

      {/* Rejected Users */}
      {rejected.length > 0 && (
        <Card>
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-900">❌ Rejected Users ({rejected.length})</CardTitle>
            <CardDescription>Access requests that were rejected</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {rejected.map(e => <UserEntry key={e.approval.id} entry={e} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}