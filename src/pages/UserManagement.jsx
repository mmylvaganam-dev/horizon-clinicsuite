import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Crown, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);

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
                         currentUser?.is_platform_owner === true;
  
  console.log('🔴 UserManagement - isPlatformOwner:', isPlatformOwner, 'user:', currentUser?.email);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!isPlatformOwner) {
        // Organization admins only see their org users
        const users = await base44.entities.User.filter({ organization_id: currentUser?.organization_id });
        console.log('Org admin - loaded users:', users.length);
        return users;
      }
      // Platform owner sees all users
      const users = await base44.asServiceRole.entities.User.list();
      console.log('Platform owner - loaded ALL users:', users.length);
      return users;
    },
    enabled: !!currentUser,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => {
      if (isPlatformOwner) {
        return base44.asServiceRole.entities.Organization.list();
      }
      return base44.entities.Organization.list();
    },
    enabled: !!currentUser,
  });

  // Create organization lookup map
  const orgMap = {};
  organizations.forEach(org => {
    orgMap[org.id] = org;
  });

  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => {
      if (isPlatformOwner) {
        return base44.asServiceRole.entities.UserRole.list();
      }
      // Org admins can see role assignments too
      return base44.entities.UserRole.list();
    },
    enabled: !!currentUser,
  });

  const assignOrgAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }) => {
      return base44.asServiceRole.entities.User.update(userId, {
        is_organization_admin: isAdmin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  // Show loading state
  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-600">Loading users...</p>
      </div>
    );
  }

  // Group users by organization using UserRole linkage
  const usersByOrg = organizations.map(org => {
    const orgUserIds = userRoles.filter(ur => ur.organization_id === org.id).map(ur => ur.user_id);
    return {
      organization: org,
      users: allUsers.filter(u => orgUserIds.includes(u.id))
    };
  });
  
  // Add users without organization assignments (excluding platform owners)
  const platformOwnerEmails = ['mmylvaganam@premierhealthcanada.ca', 'mylvaganam@premierhealthcanada.ca'];
  const assignedUserIds = new Set(userRoles.map(ur => ur.user_id));
  const unassignedUsers = allUsers.filter(u => 
    !assignedUserIds.has(u.id) && 
    !platformOwnerEmails.includes(u.email) &&
    !u.is_platform_owner
  );
  
  if (unassignedUsers.length > 0) {
    usersByOrg.push({
      organization: { id: 'unassigned', name: 'Unassigned Users (No Organization)' },
      users: unassignedUsers
    });
  }

  const getUserRoleDetails = (userId, orgId) => {
    const roles = userRoles.filter(r => r.user_id === userId && r.organization_id === orgId);
    return roles;
  };

  const UserCard = ({ user, organization }) => {
    const roles = getUserRoleDetails(user.id, organization.id);
    
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
          {user.is_organization_admin && (
            <Badge className="bg-blue-100 text-blue-800">
              <Shield className="w-3 h-3 mr-1" />
              Org Admin
            </Badge>
          )}
          {roles.length > 0 && roles.map((role, idx) => (
            <Badge key={idx} variant="outline" className="text-xs bg-slate-50">
              {role.is_primary ? '⭐ ' : ''}{role.role_id}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-1">Organization: {organization?.name || user.organization_id}</p>
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
      {isPlatformOwner && !user.is_platform_owner && organization.id !== 'unassigned' && (
        <div className="flex gap-2">
          {user.is_organization_admin ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => assignOrgAdminMutation.mutate({ userId: user.id, isAdmin: false })}
              disabled={assignOrgAdminMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              Remove Org Admin
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => setSelectedUser(user)}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Make Admin for {organization?.name}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Organization Admin</DialogTitle>
                  <DialogDescription>
                    Grant admin privileges to {user.email} for <strong className="text-blue-700">{organization?.name}</strong>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Org Admins for <strong>{organization?.name}</strong> can:
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Approve user access requests for this organization</li>
                        <li>Manage users and roles within this organization</li>
                        <li>Configure organization settings</li>
                      </ul>
                      <p className="mt-2 text-xs">You (platform owner) retain final approval authority.</p>
                    </AlertDescription>
                  </Alert>
                  {roles.length === 0 && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <AlertDescription className="text-amber-900">
                        <strong>Warning:</strong> This user has no UserRole assignments for {organization?.name}. 
                        They may need to be linked to this organization first.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setSelectedUser(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        assignOrgAdminMutation.mutate({ userId: user.id, isAdmin: true });
                        setSelectedUser(null);
                      }}
                      disabled={assignOrgAdminMutation.isPending}
                    >
                      Confirm as Admin for {organization?.name}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
      {organization.id === 'unassigned' && (
        <Badge variant="outline" className="text-slate-500">
          Not linked to any organization
        </Badge>
      )}
    </div>
  );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-600 mt-1">
          {isPlatformOwner 
            ? 'View all users across organizations and assign organization admins' 
            : 'View users in your organization'}
        </p>
      </div>

      {isPlatformOwner && (
        <Alert className="bg-purple-50 border-purple-200">
          <Crown className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            <strong>Platform Owner View:</strong> Showing {allUsers.length} total users, {userRoles.length} role assignments across {organizations.length} organizations.
          </AlertDescription>
        </Alert>
      )}
      
      <Alert className="bg-blue-50 border-blue-200">
        <Users className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Debug:</strong> {allUsers.length} users | {organizations.length} orgs | {userRoles.length} role links | {usersByOrg.length} groups displayed
        </AlertDescription>
      </Alert>

      {usersByOrg.map(({ organization, users }) => (
        <Card key={organization.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {organization.name}
            </CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? 's' : ''} • 
              {users.filter(u => u.is_organization_admin).length} org admin{users.filter(u => u.is_organization_admin).length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No users in this organization yet</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <UserCard key={user.id} user={user} organization={organization} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {usersByOrg.length === 0 && (
        <Card>
          <CardContent className="pt-8 text-center">
            <p className="text-slate-500">No organizations or users found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}