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

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['userApprovals'],
    queryFn: async () => {
      const all = await base44.entities.UserApproval.list();
      return all;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (approvalId) => {
      const user = await base44.auth.me();
      return base44.entities.UserApproval.update(approvalId, {
        status: 'approved',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userApprovals'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (approvalId) => {
      const user = await base44.auth.me();
      return base44.entities.UserApproval.update(approvalId, {
        status: 'rejected',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
        rejection_reason: rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userApprovals'] });
      setSelectedUser(null);
      setRejectionReason('');
    },
  });

  const pendingApprovals = approvals?.filter(a => a.status === 'pending') || [];
  const approvedUsers = approvals?.filter(a => a.status === 'approved') || [];
  const rejectedUsers = approvals?.filter(a => a.status === 'rejected') || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  const UserCard = ({ approval }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <p className="font-medium text-slate-900">{approval.user_email}</p>
        <p className="text-sm text-slate-500">Organization: {approval.organization_id}</p>
        {approval.approved_date && (
          <p className="text-xs text-slate-400 mt-1">
            {approval.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
            {new Date(approval.approved_date).toLocaleDateString()}
          </p>
        )}
        {approval.rejection_reason && (
          <p className="text-xs text-red-600 mt-1">Reason: {approval.rejection_reason}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {getStatusBadge(approval.status)}
        {approval.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => approveMutation.mutate(approval.id)}
              disabled={approveMutation.isPending}
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
                      onClick={() => rejectMutation.mutate(approval.id)}
                      disabled={rejectMutation.isPending}
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
        <p className="text-slate-600 mt-1">Review and approve new user access requests</p>
      </div>

      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals ({pendingApprovals.length})</CardTitle>
            <CardDescription>Users waiting for access approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <UserCard key={approval.id} approval={approval} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {approvedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approved Users ({approvedUsers.length})</CardTitle>
            <CardDescription>Users with active access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvedUsers.map((approval) => (
                <UserCard key={approval.id} approval={approval} />
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
                <UserCard key={approval.id} approval={approval} />
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