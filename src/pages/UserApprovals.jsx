import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function UserApprovals() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['userApprovals'],
    queryFn: async () => {
      const all = await base44.entities.UserApproval.list();
      return all;
    },
  });

  const isPlatformOwner = currentUser?.email === 'madhawaekanayake@gmail.com' || currentUser?.is_platform_owner;
  const isOrgAdmin = currentUser?.is_organization_admin;

  const orgAdminApproveMutation = useMutation({
    mutationFn: async (approvalId) => {
      const user = await base44.auth.me();
      return base44.entities.UserApproval.update(approvalId, {
        org_admin_status: 'approved',
        org_admin_approved_by: user.email,
        org_admin_approved_date: new Date().toISOString(),
        final_status: 'pending_platform',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userApprovals'] });
    },
  });

  const orgAdminRejectMutation = useMutation({
    mutationFn: async (approvalId) => {
      const user = await base44.auth.me();
      return base44.entities.UserApproval.update(approvalId, {
        org_admin_status: 'rejected',
        org_admin_approved_by: user.email,
        org_admin_approved_date: new Date().toISOString(),
        final_status: 'rejected',
        rejection_reason: rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userApprovals'] });
      setSelectedUser(null);
      setRejectionReason('');
    },
  });

  const platformOwnerApproveMutation = useMutation({
    mutationFn: async (approvalId) => {
      const user = await base44.auth.me();
      return base44.entities.UserApproval.update(approvalId, {
        platform_owner_status: 'approved',
        platform_owner_approved_by: user.email,
        platform_owner_approved_date: new Date().toISOString(),
        final_status: 'approved',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userApprovals'] });
    },
  });

  const platformOwnerRejectMutation = useMutation({
    mutationFn: async (approvalId) => {
      const user = await base44.auth.me();
      return base44.entities.UserApproval.update(approvalId, {
        platform_owner_status: 'rejected',
        platform_owner_approved_by: user.email,
        platform_owner_approved_date: new Date().toISOString(),
        final_status: 'rejected',
        rejection_reason: rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userApprovals'] });
      setSelectedUser(null);
      setRejectionReason('');
    },
  });

  // Filter based on user role
  let pendingOrgApprovals = [];
  let pendingPlatformApprovals = [];
  let approvedUsers = [];
  let rejectedUsers = [];

  if (isPlatformOwner) {
    // Platform owner sees everything
    pendingOrgApprovals = approvals?.filter(a => a.final_status === 'pending_org') || [];
    pendingPlatformApprovals = approvals?.filter(a => a.final_status === 'pending_platform') || [];
    approvedUsers = approvals?.filter(a => a.final_status === 'approved') || [];
    rejectedUsers = approvals?.filter(a => a.final_status === 'rejected') || [];
  } else if (isOrgAdmin) {
    // Org admin only sees their organization's pending org approvals
    pendingOrgApprovals = approvals?.filter(a => 
      a.final_status === 'pending_org' && a.organization_id === currentUser?.organization_id
    ) || [];
    approvedUsers = approvals?.filter(a => 
      a.final_status === 'approved' && a.organization_id === currentUser?.organization_id
    ) || [];
    rejectedUsers = approvals?.filter(a => 
      a.final_status === 'rejected' && a.organization_id === currentUser?.organization_id
    ) || [];
  }

  const getStatusBadge = (finalStatus, orgStatus, platformStatus) => {
    if (finalStatus === 'pending_org') {
      return <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pending Org Admin</Badge>;
    }
    if (finalStatus === 'pending_platform') {
      return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Pending Platform Owner</Badge>;
    }
    if (finalStatus === 'approved') {
      return <Badge className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
    }
    if (finalStatus === 'rejected') {
      return <Badge className="bg-red-100 text-red-800"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
    }
    return null;
  };

  const UserCard = ({ approval, showOrgActions, showPlatformActions }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <p className="font-medium text-slate-900">{approval.user_email}</p>
        <p className="text-sm text-slate-500">Organization: {approval.organization_id}</p>
        {approval.org_admin_approved_date && (
          <p className="text-xs text-slate-400 mt-1">
            Org Admin: {approval.org_admin_status} on {new Date(approval.org_admin_approved_date).toLocaleDateString()}
          </p>
        )}
        {approval.platform_owner_approved_date && (
          <p className="text-xs text-slate-400 mt-1">
            Platform Owner: {approval.platform_owner_status} on {new Date(approval.platform_owner_approved_date).toLocaleDateString()}
          </p>
        )}
        {approval.rejection_reason && (
          <p className="text-xs text-red-600 mt-1">Reason: {approval.rejection_reason}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {getStatusBadge(approval.final_status, approval.org_admin_status, approval.platform_owner_status)}
        {showOrgActions && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => orgAdminApproveMutation.mutate(approval.id)}
              disabled={orgAdminApproveMutation.isPending}
              className="text-green-600 hover:text-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setSelectedUser(approval)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Access Request</DialogTitle>
                  <DialogDescription>
                    Reject access for {approval.user_email}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Rejection Reason (optional)</label>
                    <Textarea
                      placeholder="Explain why you're rejecting this access request..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setSelectedUser(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => orgAdminRejectMutation.mutate(approval.id)}
                      disabled={orgAdminRejectMutation.isPending}
                    >
                      Reject Access
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {showPlatformActions && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => platformOwnerApproveMutation.mutate(approval.id)}
              disabled={platformOwnerApproveMutation.isPending}
              className="text-green-600 hover:text-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Final Approve
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setSelectedUser(approval)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Access Request</DialogTitle>
                  <DialogDescription>
                    Platform owner rejection for {approval.user_email}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Rejection Reason (optional)</label>
                    <Textarea
                      placeholder="Explain why you're rejecting this access request..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setSelectedUser(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => platformOwnerRejectMutation.mutate(approval.id)}
                      disabled={platformOwnerRejectMutation.isPending}
                    >
                      Reject Access
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">User Access Approvals</h1>
        <p className="text-slate-600 mt-1">
          {isPlatformOwner 
            ? 'Two-level approval system - Organization admins approve first, then you give final approval' 
            : 'Review and approve new user access requests for your organization'}
        </p>
      </div>

      {pendingOrgApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Organization Admin Approval ({pendingOrgApprovals.length})</CardTitle>
            <CardDescription>
              {isOrgAdmin 
                ? 'Users waiting for your approval as organization admin' 
                : 'Users waiting for organization admin approval'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOrgApprovals.map((approval) => (
                <UserCard key={approval.id} approval={approval} showOrgActions={isOrgAdmin} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isPlatformOwner && pendingPlatformApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Your Final Approval ({pendingPlatformApprovals.length})</CardTitle>
            <CardDescription>Users approved by org admin, awaiting your final approval as platform owner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPlatformApprovals.map((approval) => (
                <UserCard key={approval.id} approval={approval} showPlatformActions={true} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {approvedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approved Users ({approvedUsers.length})</CardTitle>
            <CardDescription>Users with active access (both levels approved)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvedUsers.map((approval) => (
                <UserCard key={approval.id} approval={approval} showOrgActions={false} showPlatformActions={false} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rejectedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rejected Users ({rejectedUsers.length})</CardTitle>
            <CardDescription>Access requests that were rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rejectedUsers.map((approval) => (
                <UserCard key={approval.id} approval={approval} showOrgActions={false} showPlatformActions={false} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && approvals?.length === 0 && (
        <Card>
          <CardContent className="pt-8 text-center">
            <p className="text-slate-500">No user access requests yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}