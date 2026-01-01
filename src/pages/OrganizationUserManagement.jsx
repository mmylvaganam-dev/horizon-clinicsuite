import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Edit, Lock, Unlock, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function OrganizationUserManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [userDialog, setUserDialog] = useState(false);
  const [roleDialog, setRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({ email: '', full_name: '', role: 'user' });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', currentUser?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: currentUser.id });
      return roles;
    },
    enabled: !!currentUser,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'PLATFORM_OWNER';
  });

  const isOrgSuperUser = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'ORG_SUPER_USER';
  });

  const canAccess = isPlatformOwner || isOrgSuperUser;

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: canAccess,
  });

  const { data: allUserRoles = [] } = useQuery({
    queryKey: ['allUserRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    enabled: canAccess,
  });

  const getUserRoles = (userId) => {
    return allUserRoles.filter(ur => ur.user_id === userId);
  };

  const getRoleName = (roleId) => {
    const role = allRoles.find(r => r.id === roleId);
    return role?.name || role?.code || 'Unknown';
  };

  const UsersListSection = () => (
    <div className="space-y-3">
      {allUsers.map((u) => {
        const userRolesList = getUserRoles(u.id);
        return (
          <div key={u.id} className="p-4 border rounded-lg hover:bg-slate-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{u.full_name}</h3>
                    <p className="text-sm text-slate-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 ml-13">
                  {userRolesList.length === 0 ? (
                    <Badge variant="outline" className="text-slate-500">No roles assigned</Badge>
                  ) : (
                    userRolesList.map((ur) => (
                      <Badge key={ur.id} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                        <Shield className="w-3 h-3 mr-1" />
                        {getRoleName(ur.role_id)}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUser(u);
                  setSelectedRoles(userRolesList.map(ur => ur.role_id));
                  setRoleDialog(true);
                }}
              >
                <Edit className="w-4 h-4 mr-1" />
                Assign Roles
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  useEffect(() => {
    if (currentUser && !canAccess) {
      toast.error('Access denied: ORG_SUPER_USER or PLATFORM_OWNER role required');
      navigate(createPageUrl('Admin'));
      return;
    }

    if (currentUser && canAccess) {
      base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'USER_ADMIN',
        action: 'view',
        record_type: 'UserManagement',
        record_id: '',
        metadata: { page: 'organization_user_management' }
      }).catch(err => console.error('Audit log error:', err));
    }
  }, [currentUser, canAccess, navigate]);

  const inviteUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.users.inviteUser(data.email, data.role);

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'USER_ADMIN',
        action: 'create',
        record_type: 'User',
        record_id: '',
        metadata: {
          target_user_email: data.email,
          initial_role: data.role,
          invited_by: currentUser.email
        }
      });
    },
    onSuccess: () => {
      setUserDialog(false);
      setUserForm({ email: '', full_name: '', role: 'user' });
      toast.success('User invited successfully');
    },
  });

  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }) => {
      // Get existing user roles
      const existingUserRoles = await base44.entities.UserRole.filter({ user_id: userId });
      
      // Remove existing roles
      for (const userRole of existingUserRoles) {
        await base44.entities.UserRole.delete(userRole.id);
      }

      // Add new roles
      for (const roleId of roles) {
        await base44.entities.UserRole.create({
          user_id: userId,
          role_id: roleId,
          assigned_at: new Date().toISOString(),
          assigned_by: currentUser.id,
          assigned_by_email: currentUser.email
        });
      }

      const roleNames = roles.map(rId => {
        const role = allRoles.find(r => r.id === rId);
        return role?.name || role?.code;
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'USER_ADMIN',
        action: 'role_change',
        record_type: 'UserRole',
        record_id: userId,
        metadata: {
          target_user_id: userId,
          roles: roleNames,
          assigned_by: currentUser.email
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      setRoleDialog(false);
      setSelectedUser(null);
      setSelectedRoles([]);
      toast.success('Roles updated successfully');
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { status: 'inactive' });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'USER_ADMIN',
        action: 'deactivate',
        record_type: 'User',
        record_id: userId,
        metadata: {
          target_user_id: userId,
          deactivated_by: currentUser.email
        }
      });
    },
    onSuccess: () => {
      toast.success('User deactivated');
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { status: 'active' });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'USER_ADMIN',
        action: 'update',
        record_type: 'User',
        record_id: userId,
        metadata: {
          target_user_id: userId,
          action: 'activate',
          activated_by: currentUser.email
        }
      });
    },
    onSuccess: () => {
      toast.success('User activated');
    },
  });

  const handleAssignRoles = () => {
    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    // Prevent ORG_SUPER_USER from assigning platform-level roles
    if (isOrgSuperUser && !isPlatformOwner) {
      const platformRoles = selectedRoles.filter(roleId => {
        const role = allRoles.find(r => r.id === roleId);
        return role?.code === 'PLATFORM_OWNER' || role?.code === 'APP_ADMIN';
      });

      if (platformRoles.length > 0) {
        toast.error('ORG_SUPER_USER cannot assign PLATFORM_OWNER or APP_ADMIN roles');
        return;
      }
    }

    assignRolesMutation.mutate({ userId: selectedUser.id, roles: selectedRoles });
  };

  const availableRoles = allRoles.filter(role => {
    // If ORG_SUPER_USER (not PLATFORM_OWNER), exclude platform-level roles
    if (isOrgSuperUser && !isPlatformOwner) {
      return role.code !== 'PLATFORM_OWNER' && role.code !== 'APP_ADMIN';
    }
    return true;
  });

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">ORG_SUPER_USER or PLATFORM_OWNER role required</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization User Management</h1>
          <p className="text-slate-500 mt-1">Manage users and role assignments</p>
        </div>
        <Button onClick={() => setUserDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {isOrgSuperUser && !isPlatformOwner && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">ORG_SUPER_USER Restrictions</p>
                <ul className="text-sm text-amber-800 mt-1 space-y-1 list-disc list-inside">
                  <li>Cannot assign PLATFORM_OWNER or APP_ADMIN roles</li>
                  <li>Can only manage users within your organization</li>
                  <li>Cannot disable AuditLog or bypass organization scoping</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersListSection />
        </CardContent>
      </Card>

      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Email address"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
            <div>
              <label className="text-sm text-slate-700 mb-2 block">Initial Role</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={userForm.role === 'admin'}
                    onChange={() => setUserForm({ ...userForm, role: 'admin' })}
                  />
                  <span className="text-sm">Admin</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={userForm.role === 'user'}
                    onChange={() => setUserForm({ ...userForm, role: 'user' })}
                  />
                  <span className="text-sm">User</span>
                </label>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              User will receive an invitation email. After registration, you can assign specific roles.
            </p>
            <Button 
              onClick={() => inviteUserMutation.mutate(userForm)} 
              disabled={!userForm.email || inviteUserMutation.isPending}
              className="w-full"
            >
              {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Roles</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                Select one or more roles for this user. Changes are audited.
              </p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableRoles.map((role) => (
                <label key={role.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, role.id]);
                      } else {
                        setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{role.name || role.code}</p>
                    {role.description && <p className="text-sm text-slate-600">{role.description}</p>}
                  </div>
                </label>
              ))}
            </div>
            <Button 
              onClick={handleAssignRoles} 
              disabled={assignRolesMutation.isPending}
              className="w-full"
            >
              {assignRolesMutation.isPending ? 'Updating...' : 'Assign Roles'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}