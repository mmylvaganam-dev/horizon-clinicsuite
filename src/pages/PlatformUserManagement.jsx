import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  Shield,
  Trash2,
  Search,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PlatformUserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteOrgId, setInviteOrgId] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: allApprovals = [] } = useQuery({
    queryKey: ['allApprovals'],
    queryFn: () => base44.entities.UserApproval.list(),
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['pendingInvitations'],
    queryFn: () => base44.entities.PendingInvitation.filter({ status: 'pending' }, '-created_date'),
  });

  const isPlatformOwner = user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                          user?.email === 'mylvaganam@premierhealthcanada.ca';

  // Filter users
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = !searchQuery || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesOrg = selectedOrgFilter === 'all' || u.organization_id === selectedOrgFilter;
    
    return matchesSearch && matchesOrg;
  });

  // Group users by organization
  const usersByOrg = organizations.map(org => ({
    org,
    users: filteredUsers.filter(u => u.organization_id === org.id),
    pendingApprovals: allApprovals.filter(a => a.organization_id === org.id && a.final_status === 'pending_platform')
  }));

  const unassignedUsers = filteredUsers.filter(u => !u.organization_id);

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role, orgId }) => {
      toast.loading('Sending invitation...', { id: 'invite-toast' });

      const org = organizations.find(o => o.id === orgId);

      // Send invitation
      await base44.users.inviteUser(email, role);

      // Record the invitation
      await base44.entities.PendingInvitation.create({
        email,
        role,
        organization_id: orgId,
        organization_name: org?.name || '',
        invited_by: user?.email || '',
        status: 'pending'
      });

      toast.loading('Email sent! Assigning to organization...', { id: 'invite-toast' });

      // Wait for user creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Assign to organization
      await base44.functions.invoke('assignUserToOrganization', {
        userEmail: email,
        organizationId: orgId
      });

      toast.success(`✅ ${email} invited and assigned!`, { id: 'invite-toast', duration: 5000 });
      return { email, role, orgId };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['allUsers']);
      await queryClient.invalidateQueries(['pendingInvitations']);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      setInviteOrgId('');
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`, { id: 'invite-toast', duration: 8000 });
    }
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      await base44.entities.PendingInvitation.update(inviteId, { status: 'cancelled' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['pendingInvitations']);
      toast.success('Invitation cancelled');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.delete(userId);
      return userId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['allUsers']);
      toast.success('✅ User deleted!');
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  const deleteApprovalMutation = useMutation({
    mutationFn: async (approvalId) => {
      await base44.entities.UserApproval.delete(approvalId);
      return approvalId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['allApprovals']);
      toast.success('✅ Invitation deleted!');
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  const approveUserMutation = useMutation({
    mutationFn: async (approval) => {
      // Update approval status
      await base44.entities.UserApproval.update(approval.id, {
        platform_owner_status: 'approved',
        platform_owner_approved_by: user.email,
        platform_owner_approved_date: new Date().toISOString(),
        final_status: 'approved'
      });

      // Assign user to organization
      await base44.functions.invoke('assignUserToOrganization', {
        userEmail: approval.user_email,
        organizationId: approval.organization_id
      });

      return approval;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['allApprovals']);
      await queryClient.invalidateQueries(['allUsers']);
      toast.success('✅ User approved and assigned!');
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  if (!isPlatformOwner) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-600 mt-2">Only platform owners can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Platform User Management</h1>
          <p className="text-slate-500 mt-1">Manage all users across all organizations</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Users className="w-4 h-4 mr-2" />
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
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
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
              <Button
                onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole, orgId: inviteOrgId })}
                disabled={!inviteEmail || !inviteOrgId || inviteUserMutation.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {inviteUserMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{allUsers.length}</p>
              </div>
              <Users className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Organizations</p>
                <p className="text-2xl font-bold text-slate-900">{organizations.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Invited (Pending)</p>
                <p className="text-2xl font-bold text-slate-900">{pendingInvitations.length}</p>
              </div>
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Unassigned</p>
                <p className="text-2xl font-bold text-slate-900">{unassignedUsers.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Pending Invitations
              <Badge className="bg-blue-500">{pendingInvitations.length} awaiting acceptance</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {pendingInvitations.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                      {invite.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{invite.email}</p>
                      <p className="text-xs text-slate-500">
                        → {invite.organization_name} · Role: <span className="font-medium">{invite.role}</span> · Invited by {invite.invited_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => cancelInviteMutation.mutate(invite.id)}
                      disabled={cancelInviteMutation.isPending}
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users by Organization */}
      {usersByOrg.map(({ org, users, pendingApprovals }) => (
        <Card key={org.id} className="border-l-4 border-teal-600">
          <CardHeader className="bg-slate-50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-teal-600" />
                {org.name}
                <Badge variant="outline">{users.length} users</Badge>
                {pendingApprovals.length > 0 && (
                  <Badge className="bg-yellow-500">{pendingApprovals.length} pending</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-sm text-slate-700 mb-3">Pending Approvals</h4>
                <div className="space-y-2">
                  {pendingApprovals.map(approval => (
                    <div key={approval.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="font-medium text-slate-900">{approval.user_email}</p>
                          <p className="text-xs text-slate-500">
                            Requested by: {approval.org_admin_approved_by}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => approveUserMutation.mutate(approval)}
                          disabled={approveUserMutation.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => deleteApprovalMutation.mutate(approval.id)}
                          disabled={deleteApprovalMutation.isPending}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Users */}
            {users.length > 0 ? (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold">
                        {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{u.full_name || 'No name'}</p>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        if (confirm(`Delete user ${u.email}?`)) {
                          deleteUserMutation.mutate(u.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No users in this organization</p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Unassigned Users */}
      {unassignedUsers.length > 0 && (
        <Card className="border-l-4 border-red-600">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              Unassigned Users
              <Badge variant="outline">{unassignedUsers.length} users</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {unassignedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-semibold">
                      {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{u.full_name || 'No name'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (confirm(`Delete user ${u.email}?`)) {
                        deleteUserMutation.mutate(u.id);
                      }
                    }}
                    disabled={deleteUserMutation.isPending}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}