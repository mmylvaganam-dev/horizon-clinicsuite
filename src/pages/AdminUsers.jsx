import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Shield, Edit, ArrowLeft, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    role_id: '', organization_id: '', location_id: '', department_id: '', is_primary: false
  });
  const [newUserForm, setNewUserForm] = useState({
    email: '', full_name: '', organization_id: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
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

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const assignRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.UserRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      setAssignRoleOpen(false);
      setRoleFormData({ role_id: '', organization_id: '', location_id: '', department_id: '', is_primary: false });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.UserRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      // Create the user first
      const newUser = await base44.entities.User.create({
        email: data.email,
        full_name: data.full_name,
        role: 'user'
      });

      // Find a default user role for the organization
      const defaultRole = roles.find(r => r.code === 'ORG_USER' || r.name?.toLowerCase().includes('user'));
      
      // Assign the user to the organization via UserRole
      if (defaultRole && data.organization_id) {
        await base44.entities.UserRole.create({
          user_id: newUser.id,
          role_id: defaultRole.id,
          organization_id: data.organization_id,
          location_id: '',
          department_id: '',
          is_primary: true,
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          assigned_by_email: user.email
        });
      }

      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      setCreateUserOpen(false);
      setNewUserForm({ email: '', full_name: '', organization_id: '' });
    },
  });

  const handleAssignRole = (e) => {
    e.preventDefault();
    const selectedRole = roles.find(r => r.id === roleFormData.role_id);
    const isGlobalRole = selectedRole?.code === 'PLATFORM_OWNER' || selectedRole?.code === 'APP_ADMIN';
    
    assignRoleMutation.mutate({
      user_id: selectedUser.id,
      role_id: roleFormData.role_id,
      organization_id: isGlobalRole ? '' : roleFormData.organization_id,
      location_id: isGlobalRole ? '' : roleFormData.location_id,
      department_id: isGlobalRole ? '' : roleFormData.department_id,
      is_primary: roleFormData.is_primary
    });
  };

  const getUserRoles = (userId) => {
    return userRoles.filter(ur => ur.user_id === userId);
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : roleId;
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : 'N/A';
  };

  const filteredLocations = roleFormData.organization_id
    ? locations.filter(l => l.organization_id === roleFormData.organization_id)
    : [];

  const filteredDepartments = roleFormData.organization_id
    ? departments.filter(d => d.organization_id === roleFormData.organization_id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Admin')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Users & Roles</h1>
            <p className="text-slate-500 mt-1">{users.length} users</p>
          </div>
        </div>
        <Button onClick={() => setCreateUserOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const userRolesList = getUserRoles(user.id);
            return (
              <Card key={user.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{user.full_name}</h3>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {userRolesList.length === 0 ? (
                          <Badge variant="outline" className="text-slate-500">No roles assigned</Badge>
                        ) : (
                          userRolesList.map((ur) => {
                           const role = roles.find(r => r.id === ur.role_id);
                           const isGlobal = role?.code === 'PLATFORM_OWNER' || role?.code === 'APP_ADMIN';
                           return (
                             <Badge key={ur.id} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 gap-2">
                               <Shield className="w-3 h-3" />
                               {getRoleName(ur.role_id)}
                               {!isGlobal && ur.organization_id && ` @ ${getOrgName(ur.organization_id)}`}
                               {isGlobal && ' (Global)'}
                               {ur.is_primary && <span className="text-xs">(Primary)</span>}
                               <button
                                 onClick={() => removeRoleMutation.mutate(ur.id)}
                                 className="ml-1 hover:text-rose-600"
                               >
                                 <X className="w-3 h-3" />
                               </button>
                             </Badge>
                           );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedUser(user); setAssignRoleOpen(true); }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Assign Role
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <input
                type="email"
                className="w-full px-3 py-2 border rounded-lg"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={newUserForm.full_name}
                onChange={(e) => setNewUserForm({...newUserForm, full_name: e.target.value})}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization *</label>
              <Select value={newUserForm.organization_id} onValueChange={(v) => setNewUserForm({...newUserForm, organization_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.organization_name || org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createUserMutation.mutate(newUserForm)}
                disabled={!newUserForm.email || !newUserForm.full_name || !newUserForm.organization_id || createUserMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignRoleOpen} onOpenChange={setAssignRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignRole} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role *</label>
              <Select value={roleFormData.role_id} onValueChange={(v) => setRoleFormData({...roleFormData, role_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.filter(role => {
                    const currentUserRoles = getUserRoles(user.id);
                    const isPlatformOwner = currentUserRoles.some(ur => {
                      const r = roles.find(rl => rl.id === ur.role_id);
                      return r?.code === 'PLATFORM_OWNER';
                    });
                    if (!isPlatformOwner && role.code === 'PLATFORM_OWNER') return false;
                    return true;
                  }).map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {(role.code === 'PLATFORM_OWNER' || role.code === 'APP_ADMIN') && ' (Global)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {roleFormData.role_id && !['PLATFORM_OWNER', 'APP_ADMIN'].includes(roles.find(r => r.id === roleFormData.role_id)?.code) && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization *</label>
                  <Select value={roleFormData.organization_id} onValueChange={(v) => setRoleFormData({...roleFormData, organization_id: v, location_id: '', department_id: ''})} required>
                    <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>{org.organization_name || org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {roleFormData.role_id && ['PLATFORM_OWNER', 'APP_ADMIN'].includes(roles.find(r => r.id === roleFormData.role_id)?.code) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900 font-semibold">Global Role</p>
                <p className="text-xs text-blue-700 mt-1">This role applies across all organizations</p>
              </div>
            )}
            {roleFormData.role_id && !['PLATFORM_OWNER', 'APP_ADMIN'].includes(roles.find(r => r.id === roleFormData.role_id)?.code) && roleFormData.organization_id && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location (Optional)</label>
                  <Select value={roleFormData.location_id} onValueChange={(v) => setRoleFormData({...roleFormData, location_id: v})}>
                    <SelectTrigger><SelectValue placeholder="All locations" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Locations</SelectItem>
                      {filteredLocations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department (Optional)</label>
                  <Select value={roleFormData.department_id} onValueChange={(v) => setRoleFormData({...roleFormData, department_id: v})}>
                    <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Departments</SelectItem>
                      {filteredDepartments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={roleFormData.is_primary}
                onChange={(e) => setRoleFormData({...roleFormData, is_primary: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="is_primary" className="text-sm">Set as primary role</label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setAssignRoleOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                Assign Role
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}