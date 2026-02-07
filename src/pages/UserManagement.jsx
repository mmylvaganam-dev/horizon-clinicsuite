import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Crown, Building2, AlertTriangle, Ban, Trash2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import UnassignedUsersSection from '@/components/UnassignedUsersSection';
import { useOrganization } from '@/components/OrganizationProvider';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const { isPlatformOwner: isPlatformOwnerFromContext, selectedOrgId } = useOrganization();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Auth failed, using JWT fallback');
        const token = localStorage.getItem('base44_token') || sessionStorage.getItem('base44_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return {
            email: payload.sub,
            is_platform_owner: payload.sub === 'mmylvaganam@premierhealthcanada.ca' || 
                               payload.sub === 'mylvaganam@premierhealthcanada.ca'
          };
        }
        return null;
      }
    },
  });

  const isPlatformOwner = currentUser?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                         currentUser?.email === 'mylvaganam@premierhealthcanada.ca' || 
                         currentUser?.is_platform_owner === true ||
                         isPlatformOwnerFromContext;
  
  console.log('🔴 UserManagement - isPlatformOwner:', isPlatformOwner, 'user:', currentUser?.email, 'selectedOrgId:', selectedOrgId);

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!isPlatformOwner) {
        // Organization admins only see their org users
        const users = await base44.entities.User.filter({ organization_id: currentUser?.organization_id });
        console.log('Org admin - loaded users:', users.length);
        return users;
      }
      // Platform owner sees all users - use backend function
      const response = await base44.functions.invoke('listAllUsers');
      console.log('Platform owner - loaded ALL users:', response.data.users.length);
      return response.data.users;
    },
    enabled: !!currentUser && isPlatformOwner,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
    enabled: !!currentUser,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!currentUser,
  });

  // CRITICAL: Get the selected company ID from the dropdown organization selection
  const selectedCompanyId = selectedOrgId && organizations.length > 0
    ? organizations.find(org => org.id === selectedOrgId)?.company_id
    : null;
  
  console.log('🔵 UserManagement Filter Debug:', {
    selectedOrgId,
    selectedCompanyId,
    isPlatformOwner,
    totalUsers: allUsers.length,
    totalCompanies: companies.length
  });

  // Get all company organizations
  const getCompanyOrganizations = (companyId) => {
    return organizations.filter(org => org.company_id === companyId);
  };

  // Get all users for a company (by organization assignment)
  const getCompanyUsers = (companyId) => {
    const companyOrgIds = getCompanyOrganizations(companyId).map(o => o.id);
    const users = allUsers.filter(u => u.organization_id && companyOrgIds.includes(u.organization_id));
    console.log(`Users for company ${companyId}:`, users.length, users.map(u => u.email));
    return users;
  };

  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    enabled: !!currentUser,
  });

  const assignCompanyAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }) => {
      const response = await base44.functions.invoke('assignUserToOrganization', { 
        userId, 
        isCompanyAdmin: isAdmin 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const assignToOrgMutation = useMutation({
    mutationFn: async ({ userId, orgId }) => {
      console.log('🔵 Assigning user', userId, 'to org', orgId);
      
      const response = await base44.functions.invoke('assignUserToOrganization', { userId, orgId });
      
      console.log('✅ User assigned successfully:', response.data);
      return response.data;
    },
    onSuccess: async () => {
      // Force refetch all related data
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['allUsers'] }),
        queryClient.refetchQueries({ queryKey: ['userRoles'] }),
        queryClient.refetchQueries({ queryKey: ['organizations'] }),
        queryClient.refetchQueries({ queryKey: ['companies'] })
      ]);
      setSelectedUser(null);
    },
    onError: (error) => {
      console.error('❌ Assignment failed:', error);
      console.error('Error details:', error.response?.data || error);
      alert(`Failed to assign user: ${error.response?.data?.error || error.message}`);
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ userEmail, reason }) => {
      return base44.entities.BlockedUser.create({
        email: userEmail,
        reason: reason || 'No reason provided',
        blocked_by: currentUser.email,
        blocked_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setSelectedUser(null);
      alert('User blocked successfully');
    },
    onError: (error) => {
      console.error('❌ Block failed:', error);
      alert(`Failed to block user: ${error.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await base44.functions.invoke('assignUserToOrganization', { 
        userId, 
        deleteUser: true 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      setSelectedUser(null);
      alert('User deleted successfully');
    },
    onError: (error) => {
      console.error('❌ Delete failed:', error);
      alert(`Failed to delete user: ${error.response?.data?.error || error.message}`);
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId) => {
      // Create approval record
      return base44.entities.UserApproval.create({
        user_email: allUsers.find(u => u.id === userId)?.email,
        status: 'approved',
        final_status: 'approved',
        approved_by: currentUser.email,
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setSelectedUser(null);
      alert('User approved successfully');
    },
    onError: (error) => {
      console.error('❌ Approval failed:', error);
      alert(`Failed to approve user: ${error.message}`);
    },
  });

  // Show loading state
  if (rolesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-600">Loading users and organizations...</p>
      </div>
    );
  }

  // CRITICAL: Filter companies based on dropdown selection
  // Platform owner with selection: show ONLY selected company
  // Platform owner without selection: show all companies
  // Company admin: show only their company
  const filteredCompanies = isPlatformOwner && selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : isPlatformOwner
    ? companies
    : companies.filter(c => c.id === currentUser?.company_id);

  console.log('📊 Filtered Companies:', filteredCompanies.map(c => c.company_legal_name));

  // Get unassigned users (users without organization)
  const unassignedUsers = allUsers.filter(u => !u.organization_id);
  
  // Map filtered companies to their users
  const usersByCompany = filteredCompanies.map(company => {
    const users = getCompanyUsers(company.id);
    return {
      company,
      users
    };
  });

  console.log('📊 UserManagement Final Data:', {
    filteredCompanies: filteredCompanies.length,
    usersByCompany: usersByCompany.map(c => ({ name: c.company.company_legal_name, users: c.users.length })),
    unassignedUsers: unassignedUsers.length
  });

  const getUserRoleDetails = (userId, orgId) => {
    const roles = userRoles.filter(r => r.user_id === userId && r.organization_id === orgId);
    return roles;
  };

  const UserCard = ({ user, company }) => {
    const roles = getUserRoleDetails(user.id, user.organization_id);
    
    return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-slate-900">{user.email}</p>
          {user.is_platform_owner && (
            <Badge className="bg-purple-100 text-purple-800">
              <Crown className="w-3 h-3 mr-1" />
              Platform Owner
            </Badge>
          )}
          {user.is_company_admin && (
            <Badge className="bg-blue-100 text-blue-800">
              <Shield className="w-3 h-3 mr-1" />
              Company Admin
            </Badge>
          )}
          {roles.length > 0 && roles.map((role, idx) => (
            <Badge key={idx} variant="outline" className="text-xs bg-slate-50">
              {role.is_primary ? '⭐ ' : ''}{role.role_id}
            </Badge>
          ))}
        </div>
        {user.full_name && <p className="text-sm text-slate-600">{user.full_name}</p>}
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-slate-400">System Role: {user.role || 'user'}</p>
          {roles.length > 0 && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ {roles.length} role assignment{roles.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {!user.organization_id && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                Assign to Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign User to Organization</DialogTitle>
                <DialogDescription>Select which organization this user belongs to</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {organizations
                  .filter(org => org.company_id === company.id)
                  .map(org => (
                    <Button
                      key={org.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => assignToOrgMutation.mutate({ userId: user.id, orgId: org.id })}
                      disabled={assignToOrgMutation.isPending}
                    >
                      {org.name}
                    </Button>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {!user.is_company_admin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 hover:text-blue-700"
              >
                <Shield className="w-4 h-4 mr-1" />
                Make Company Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make Company Admin</DialogTitle>
                <DialogDescription>
                  Grant {user.email} company admin privileges for {company?.company_legal_name}
                </DialogDescription>
              </DialogHeader>
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Company Admins can add, remove, and manage users for this company.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3 justify-end">
                <Button variant="outline">Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => assignCompanyAdminMutation.mutate({ userId: user.id, isAdmin: true })}
                  disabled={assignCompanyAdminMutation.isPending}
                >
                  Confirm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {user.is_company_admin && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => assignCompanyAdminMutation.mutate({ userId: user.id, isAdmin: false })}
            disabled={assignCompanyAdminMutation.isPending}
          >
            Remove Company Admin
          </Button>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 border-red-200"
            >
              <Ban className="w-4 h-4 mr-1" />
              Block
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block User</DialogTitle>
              <DialogDescription>
                Permanently block {user.email} from accessing the platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <Ban className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Warning:</strong> This user will be immediately logged out and unable to access any part of the platform.
                </AlertDescription>
              </Alert>
              <div>
                <label className="text-sm font-medium">Reason for blocking:</label>
                <textarea
                  id={`block-reason-${user.id}`}
                  className="w-full mt-1 p-2 border rounded-md"
                  rows="3"
                  placeholder="Enter reason for blocking this user..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline">Cancel</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    const reason = document.getElementById(`block-reason-${user.id}`).value;
                    blockUserMutation.mutate({ userEmail: user.email, reason });
                  }}
                  disabled={blockUserMutation.isPending}
                >
                  Block User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-red-900 hover:text-red-900 border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Permanently delete {user.email} from the platform
              </DialogDescription>
            </DialogHeader>
            <Alert className="bg-red-50 border-red-200">
              <Trash2 className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Permanent Action:</strong> This cannot be undone. User will be completely removed from the system.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3 justify-end">
              <Button variant="outline">Cancel</Button>
              <Button
                className="bg-red-900 hover:bg-red-950"
                onClick={() => deleteUserMutation.mutate(user.id)}
                disabled={deleteUserMutation.isPending}
              >
                Delete User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>



    </div>
  );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company User Management</h1>
        <p className="text-slate-600 mt-1">
          Platform owner control - Approve/Block users at company level. Prevents app abuse and unauthorized access.
        </p>
      </div>

      {isPlatformOwner && (
        <Alert className="bg-purple-50 border-purple-200">
          <Crown className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            <strong>Platform Owner Authority:</strong> Showing {allUsers.length} total users across {companies.length} companies. You have final approval/block authority regardless of company admin actions.
          </AlertDescription>
        </Alert>
      )}

      <UnassignedUsersSection
        unassignedUsers={unassignedUsers}
        organizations={organizations}
        companies={companies}
        onAssign={(data) => assignToOrgMutation.mutate(data)}
        isAssigning={assignToOrgMutation.isPending}
      />

      {usersByCompany.map(({ company, users }) => (
        <Card key={company.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {company.company_legal_name || company.name}
            </CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? 's' : ''} • Code: {company.company_code} • Country: {company.country_code}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No users in this company yet</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <UserCard key={user.id} user={user} company={company} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {usersByCompany.length === 0 && (
        <Card>
          <CardContent className="pt-8 text-center">
            <p className="text-slate-500">No companies or users found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}