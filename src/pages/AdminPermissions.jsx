import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield, ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);
  const [permFormOpen, setPermFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    module: '', resource: '', action: 'view', code: '', description: ''
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => base44.entities.Permission.list(),
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list(),
  });

  const createPermMutation = useMutation({
    mutationFn: (data) => base44.entities.Permission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setPermFormOpen(false);
      setFormData({ module: '', resource: '', action: 'view', code: '', description: '' });
    },
  });

  const toggleRolePermMutation = useMutation({
    mutationFn: ({ roleId, permId, granted }) => {
      const existing = rolePermissions.find(rp => rp.role_id === roleId && rp.permission_id === permId);
      if (existing) {
        return base44.entities.RolePermission.update(existing.id, { granted });
      } else {
        return base44.entities.RolePermission.create({ role_id: roleId, permission_id: permId, granted });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
    },
  });

  const handleCreatePermission = (e) => {
    e.preventDefault();
    const code = `${formData.module}:${formData.resource}:${formData.action}`;
    createPermMutation.mutate({ ...formData, code });
  };

  const hasPermission = (roleId, permId) => {
    const rp = rolePermissions.find(rp => rp.role_id === roleId && rp.permission_id === permId);
    return rp ? rp.granted : false;
  };

  const togglePermission = (roleId, permId) => {
    const current = hasPermission(roleId, permId);
    toggleRolePermMutation.mutate({ roleId, permId, granted: !current });
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const module = perm.module || 'Other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});

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
            <h1 className="text-3xl font-bold text-slate-900">Permissions</h1>
            <p className="text-slate-500 mt-1">Manage role permissions</p>
          </div>
        </div>
        <Button onClick={() => setPermFormOpen(true)} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" />
          New Permission
        </Button>
      </div>

      <Card className="p-4 bg-white border-0 shadow-sm">
        <Label className="text-sm font-medium mb-3 block">Select Role</Label>
        <Select value={selectedRole?.id} onValueChange={(v) => setSelectedRole(roles.find(r => r.id === v))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role to configure permissions" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {loadingPerms || loadingRoles ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : selectedRole ? (
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <Card key={module} className="p-5 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-rose-500" />
                {module}
              </h3>
              <div className="space-y-2">
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{perm.resource} - {perm.action}</p>
                      {perm.description && (
                        <p className="text-xs text-slate-500 mt-1">{perm.description}</p>
                      )}
                      <Badge variant="outline" className="text-xs mt-1">{perm.code}</Badge>
                    </div>
                    <button
                      onClick={() => togglePermission(selectedRole.id, perm.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        hasPermission(selectedRole.id, perm.id) ? 'bg-teal-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hasPermission(selectedRole.id, perm.id) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Select a role</h3>
          <p className="text-slate-500 mt-1">Choose a role to configure its permissions</p>
        </Card>
      )}

      <Dialog open={permFormOpen} onOpenChange={setPermFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Permission</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePermission} className="space-y-4">
            <div className="space-y-2">
              <Label>Module *</Label>
              <Input
                value={formData.module}
                onChange={(e) => setFormData({...formData, module: e.target.value})}
                placeholder="EMR, PMS, BILLING..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Resource *</Label>
              <Input
                value={formData.resource}
                onChange={(e) => setFormData({...formData, resource: e.target.value})}
                placeholder="patient, appointment, record..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Action *</Label>
              <Select value={formData.action} onValueChange={(v) => setFormData({...formData, action: v})} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="print">Print</SelectItem>
                  <SelectItem value="sign">Sign</SelectItem>
                  <SelectItem value="release">Release</SelectItem>
                  <SelectItem value="refund_void">Refund/Void</SelectItem>
                  <SelectItem value="admin_config">Admin Config</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Permission description"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setPermFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}