import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, Plus, Edit2, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const appliesToLabels = {
  patient_records: 'Patient Records',
  lab_results: 'Lab Results',
  cardio_results: 'Cardio Results',
  pft_results: 'PFT Results',
  radiology_results: 'Radiology Results',
  medical_records: 'Medical Records',
  billing_invoices: 'Billing Invoices',
  pharmacy_sales: 'Pharmacy Sales',
  audit_logs: 'Audit Logs',
  messages: 'Messages',
  all_clinical_data: 'All Clinical Data'
};

const archiveModeColors = {
  readonly: 'bg-blue-100 text-blue-700',
  delete: 'bg-rose-100 text-rose-700',
  archive_external: 'bg-amber-100 text-amber-700'
};

export default function AdminRetentionPolicies() {
  const [open, setOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [formData, setFormData] = useState({
    organization_id: '',
    applies_to: 'patient_records',
    retention_years: 7,
    archive_mode: 'readonly',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['retentionPolicies'],
    queryFn: () => base44.entities.RetentionPolicy.list('-created_at'),
  });

  const { data: deploymentProfile } = useQuery({
    queryKey: ['deploymentProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.DeploymentProfile.list();
      return profiles[0] || null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editPolicy) {
        await base44.entities.RetentionPolicy.update(editPolicy.id, data);
        
        await base44.entities.AuditLog.create({
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_email: user.email,
          organization_id: data.organization_id || '',
          location_id: '',
          patient_id: '',
          module: 'ADMIN',
          action: 'update_retention_policy',
          record_type: 'RetentionPolicy',
          record_id: editPolicy.id,
          metadata: {
            applies_to: data.applies_to,
            retention_years: data.retention_years,
            archive_mode: data.archive_mode
          }
        });
      } else {
        const policy = await base44.entities.RetentionPolicy.create({
          ...data,
          is_active: true,
          created_by: user.id,
          created_by_email: user.email,
          created_at: new Date().toISOString()
        });

        await base44.entities.AuditLog.create({
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_email: user.email,
          organization_id: data.organization_id || '',
          location_id: '',
          patient_id: '',
          module: 'ADMIN',
          action: 'create_retention_policy',
          record_type: 'RetentionPolicy',
          record_id: policy.id,
          metadata: {
            applies_to: data.applies_to,
            retention_years: data.retention_years,
            archive_mode: data.archive_mode
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retentionPolicies'] });
      toast.success(editPolicy ? 'Policy updated' : 'Policy created');
      setOpen(false);
      setEditPolicy(null);
      setFormData({
        organization_id: '',
        applies_to: 'patient_records',
        retention_years: 7,
        archive_mode: 'readonly',
        notes: ''
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save policy');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ policyId, isActive }) => {
      await base44.entities.RetentionPolicy.update(policyId, { is_active: !isActive });
      
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: isActive ? 'deactivate_retention_policy' : 'activate_retention_policy',
        record_type: 'RetentionPolicy',
        record_id: policyId,
        metadata: { new_status: !isActive }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retentionPolicies'] });
      toast.success('Policy status updated');
    },
  });

  const handleEdit = (policy) => {
    setEditPolicy(policy);
    setFormData({
      organization_id: policy.organization_id || '',
      applies_to: policy.applies_to,
      retention_years: policy.retention_years,
      archive_mode: policy.archive_mode,
      notes: policy.notes || ''
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!formData.retention_years || formData.retention_years < 1) {
      toast.error('Retention years must be at least 1');
      return;
    }

    saveMutation.mutate(formData);
  };

  const getEffectivePolicies = () => {
    const effective = {};
    const defaultPolicies = policies.filter(p => !p.organization_id && p.is_active);
    
    // Apply defaults first
    defaultPolicies.forEach(p => {
      effective[p.applies_to] = {
        retention_years: p.retention_years,
        archive_mode: p.archive_mode,
        source: 'default',
        policy: p
      };
    });

    // Then apply org-specific overrides
    organizations.forEach(org => {
      const orgPolicies = policies.filter(p => p.organization_id === org.id && p.is_active);
      orgPolicies.forEach(p => {
        if (!effective[org.id]) effective[org.id] = {};
        effective[org.id][p.applies_to] = {
          retention_years: p.retention_years,
          archive_mode: p.archive_mode,
          source: 'organization',
          policy: p
        };
      });
    });

    return effective;
  };

  const defaultPolicies = policies.filter(p => !p.organization_id);
  const orgSpecificPolicies = policies.filter(p => p.organization_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Retention Policies</h1>
          <p className="text-slate-500 mt-1">Manage data retention and archival policies</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setEditPolicy(null);
            setFormData({
              organization_id: '',
              applies_to: 'patient_records',
              retention_years: 7,
              archive_mode: 'readonly',
              notes: ''
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editPolicy ? 'Edit Policy' : 'Create Retention Policy'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Organization (optional)</Label>
                <Select 
                  value={formData.organization_id} 
                  onValueChange={(value) => setFormData({...formData, organization_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Global default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Global Default</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Applies To *</Label>
                <Select 
                  value={formData.applies_to} 
                  onValueChange={(value) => setFormData({...formData, applies_to: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(appliesToLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Retention Years *</Label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.retention_years}
                  onChange={(e) => setFormData({...formData, retention_years: parseInt(e.target.value) || 1})}
                />
              </div>

              <div>
                <Label>Archive Mode</Label>
                <Select 
                  value={formData.archive_mode} 
                  onValueChange={(value) => setFormData({...formData, archive_mode: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="readonly">Read Only</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="archive_external">Archive External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Policy justification or notes..."
                />
              </div>

              {formData.archive_mode === 'delete' && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-900">Permanent Deletion</p>
                    <p className="text-sm text-rose-700 mt-1">
                      Data will be permanently deleted after retention period. This cannot be undone.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {editPolicy ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="default">
        <TabsList>
          <TabsTrigger value="default">
            <Shield className="w-4 h-4 mr-2" />
            Default Policies
          </TabsTrigger>
          <TabsTrigger value="org-specific">
            Organization Overrides
          </TabsTrigger>
          <TabsTrigger value="effective">
            Effective Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="default" className="space-y-3 mt-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : defaultPolicies.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No default retention policies defined</p>
            </Card>
          ) : (
            defaultPolicies.map((policy) => (
              <Card key={policy.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="capitalize">
                        {appliesToLabels[policy.applies_to]}
                      </Badge>
                      <Badge className={archiveModeColors[policy.archive_mode]}>
                        {policy.archive_mode.replace(/_/g, ' ')}
                      </Badge>
                      {!policy.is_active && (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {policy.retention_years} years
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Created by {policy.created_by_email} • {format(new Date(policy.created_at), 'MMM d, yyyy')}
                    </p>
                    {policy.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">{policy.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={policy.is_active}
                      onCheckedChange={() => toggleActiveMutation.mutate({ policyId: policy.id, isActive: policy.is_active })}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="org-specific" className="space-y-3 mt-6">
          {orgSpecificPolicies.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No organization-specific overrides</p>
            </Card>
          ) : (
            orgSpecificPolicies.map((policy) => {
              const org = organizations.find(o => o.id === policy.organization_id);
              return (
                <Card key={policy.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {org && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {org.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {appliesToLabels[policy.applies_to]}
                        </Badge>
                        <Badge className={archiveModeColors[policy.archive_mode]}>
                          {policy.archive_mode.replace(/_/g, ' ')}
                        </Badge>
                        {!policy.is_active && (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-slate-900">
                        {policy.retention_years} years
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Created by {policy.created_by_email} • {format(new Date(policy.created_at), 'MMM d, yyyy')}
                      </p>
                      {policy.notes && (
                        <p className="text-sm text-slate-600 mt-2 italic">{policy.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={policy.is_active}
                        onCheckedChange={() => toggleActiveMutation.mutate({ policyId: policy.id, isActive: policy.is_active })}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="effective" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Effective Retention Policies by Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {organizations.map((org) => {
                  const effective = getEffectivePolicies();
                  const orgPolicies = effective[org.id] || {};
                  
                  return (
                    <div key={org.id} className="border-b pb-4 last:border-b-0">
                      <h3 className="font-semibold text-slate-900 mb-3">{org.name}</h3>
                      <div className="grid gap-2">
                        {Object.entries(appliesToLabels).map(([key, label]) => {
                          const policy = orgPolicies[key] || effective[key];
                          
                          return (
                            <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <span className="text-sm text-slate-700">{label}</span>
                              {policy ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{policy.retention_years} years</span>
                                  <Badge variant="outline" className="text-xs">
                                    {policy.source === 'organization' ? 'Override' : 'Default'}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">Not defined</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}