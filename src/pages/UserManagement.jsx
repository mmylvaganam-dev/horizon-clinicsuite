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
    queryFn: () => base44.auth.me(),
  });

  const isPlatformOwner = currentUser?.email === 'madhawaekanayake@gmail.com' || currentUser?.is_platform_owner;

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!isPlatformOwner) {
        // Organization admins only see their org users
        const users = await base44.entities.User.filter({ organization_id: currentUser?.organization_id });
        return users;
      }
      // Platform owner sees all users
      const users = await base44.entities.User.list();
      return users;
    },
    enabled: !!currentUser,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const assignOrgAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }) => {
      return base44.entities.User.update(userId, {
        is_organization_admin: isAdmin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  // Group users by organization
  const usersByOrg = organizations.map(org => ({
    organization: org,
    users: allUsers.filter(u => u.organization_id === org.id)
  }));

  const UserCard = ({ user, organization }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
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
        </div>
        <p className="text-sm text-slate-500 mt-1">Organization: {organization?.name || user.organization_id}</p>
        {user.full_name && <p className="text-sm text-slate-600">{user.full_name}</p>}
        <p className="text-xs text-slate-400 mt-1">Role: {user.role || 'user'}</p>
      </div>
      {isPlatformOwner && !user.is_platform_owner && (
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
                  Make Org Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Organization Admin</DialogTitle>
                  <DialogDescription>
                    Grant master admin privileges to {user.email} for {organization?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <Shield className="w-4 h-4" />
                    <AlertDescription>
                      Organization admins can approve new user access requests for their organization. 
                      You (platform owner) will have final approval authority.
                    </AlertDescription>
                  </Alert>
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
                      Confirm Assignment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );

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
            <strong>Platform Owner View:</strong> You can see all users across all organizations and assign organization admin roles.
          </AlertDescription>
        </Alert>
      )}

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