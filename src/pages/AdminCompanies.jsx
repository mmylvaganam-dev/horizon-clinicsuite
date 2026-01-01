import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Edit, Lock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AdminCompanies() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedOrgForLocation, setSelectedOrgForLocation] = useState('');

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

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'PLATFORM_OWNER';
  });

  const isOrgSuperUser = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'ORG_SUPER_USER';
  });

  const canAccess = isPlatformOwner || isOrgSuperUser;

  if (currentUser && !canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">PLATFORM_OWNER or ORG_SUPER_USER role required</p>
        </Card>
      </div>
    );
  }

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: canAccess,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    enabled: canAccess,
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Organization.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: result.id,
        location_id: '',
        patient_id: '',
        module: 'ADMIN_COMPANY',
        action: 'create',
        record_type: 'Organization',
        record_id: result.id,
        metadata: { organization_name: data.name }
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setOrgDialogOpen(false);
      setEditingOrg(null);
      toast.success('Organization created');
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.Organization.update(id, data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: id,
        location_id: '',
        patient_id: '',
        module: 'ADMIN_COMPANY',
        action: 'update',
        record_type: 'Organization',
        record_id: id,
        metadata: { organization_name: data.name, status: data.status }
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setOrgDialogOpen(false);
      setEditingOrg(null);
      toast.success('Organization updated');
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Location.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: data.organization_id,
        location_id: result.id,
        patient_id: '',
        module: 'ADMIN_COMPANY',
        action: 'create',
        record_type: 'Location',
        record_id: result.id,
        metadata: { location_name: data.name }
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setLocationDialogOpen(false);
      setEditingLocation(null);
      toast.success('Location created');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Companies & Organizations</h1>
          <p className="text-slate-500 mt-1">Manage organizations and locations</p>
        </div>
        <Badge className="bg-blue-100 text-blue-700">
          {isPlatformOwner ? 'PLATFORM_OWNER' : 'ORG_SUPER_USER'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organizations
            </CardTitle>
            <Button onClick={() => { setEditingOrg(null); setOrgDialogOpen(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Organization
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {organizations.map(org => (
                <div key={org.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{org.name}</p>
                      <p className="text-sm text-slate-500">{org.type || 'Organization'} • {org.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                        {org.status || 'active'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setEditingOrg(org); setOrgDialogOpen(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {organizations.length === 0 && (
                <p className="text-center text-slate-500 py-8">No organizations yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Locations
            </CardTitle>
            <Button onClick={() => { setEditingLocation(null); setLocationDialogOpen(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Location
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {locations.map(loc => {
                const org = organizations.find(o => o.id === loc.organization_id);
                return (
                  <div key={loc.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{loc.name}</p>
                        <p className="text-sm text-slate-500">{org?.name || 'Unknown Org'}</p>
                        {loc.address && <p className="text-xs text-slate-400 mt-1">{loc.address}</p>}
                      </div>
                      <Badge variant={loc.status === 'active' ? 'default' : 'secondary'}>
                        {loc.status || 'active'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {locations.length === 0 && (
                <p className="text-center text-slate-500 py-8">No locations yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
              name: formData.get('name'),
              code: formData.get('code') || formData.get('name').toLowerCase().replace(/\s+/g, '_'),
              type: formData.get('type') || 'clinic',
              status: formData.get('status'),
            };
            if (editingOrg) {
              updateOrgMutation.mutate({ id: editingOrg.id, data });
            } else {
              createOrgMutation.mutate(data);
            }
          }} className="space-y-4">
            <div>
              <Label>Organization Name *</Label>
              <Input name="name" defaultValue={editingOrg?.name} required />
            </div>
            <div>
              <Label>Code *</Label>
              <Input name="code" defaultValue={editingOrg?.code} placeholder="e.g., clinic_main" required={!editingOrg} disabled={!!editingOrg} />
              {editingOrg && <p className="text-xs text-slate-500 mt-1">Code cannot be changed after creation</p>}
            </div>
            <div>
              <Label>Type</Label>
              <Select name="type" defaultValue={editingOrg?.type || 'clinic'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="diagnostic_center">Diagnostic Center</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={editingOrg?.status || 'active'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              {editingOrg ? 'Update' : 'Create'} Organization
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            createLocationMutation.mutate({
              organization_id: formData.get('organization_id'),
              name: formData.get('name'),
              address: formData.get('address'),
              status: 'active',
            });
          }} className="space-y-4">
            <div>
              <Label>Organization *</Label>
              <Select name="organization_id" required>
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
              <Label>Location Name *</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" />
            </div>
            <Button type="submit" className="w-full">Create Location</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}