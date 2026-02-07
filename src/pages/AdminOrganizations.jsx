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
import { Plus, Building2, Edit, Trash2, ArrowLeft, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import { useOrganization } from '@/components/OrganizationProvider';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-100 text-amber-700 border-amber-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AdminOrganizations() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', type: 'clinic', country_code: '', 
    address: '', phone: '', email: '', tax_id: '', 
    license_number: '', status: 'active'
  });

  const { isPlatformOwner, selectedOrgId, user } = useOrganization();

  const { data: allOrganizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
  });

  // CRITICAL: Filter organizations based on user role
  // Platform owner: show organizations from selected company only
  // Company admin: show only their company's organizations
  const { data: selectedCompany } = useQuery({
    queryKey: ['selectedCompany', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      const selectedOrg = allOrganizations.find(o => o.id === selectedOrgId);
      if (!selectedOrg?.company_id) return null;
      const companies = await base44.entities.CompanyProfile.list();
      return companies.find(c => c.id === selectedOrg.company_id);
    },
    enabled: !!selectedOrgId && allOrganizations.length > 0,
  });

  // Filter organizations: platform owner sees selected company's orgs, company admin sees their company's orgs only
  const organizations = isPlatformOwner 
    ? allOrganizations.filter(org => org.company_id === selectedCompany?.id)
    : allOrganizations.filter(org => 
        org.company_id === user?.company_id || 
        (user?.organization_id && allOrganizations.find(o => o.id === user.organization_id)?.company_id === org.company_id)
      );

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list(),
  });

  const { data: companyModuleAccess = [] } = useQuery({
    queryKey: ['companyModuleAccess'],
    queryFn: () => base44.entities.CompanyModuleAccess.list(),
  });

  const { data: orgModuleAccess = [] } = useQuery({
    queryKey: ['orgModuleAccess'],
    queryFn: () => base44.entities.OrganizationModuleAccess.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setFormOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Organization.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  const toggleOrgModuleMutation = useMutation({
    mutationFn: async ({ orgId, moduleCode, isEnabled }) => {
      const existing = orgModuleAccess.find(
        oma => oma.organization_id === orgId && oma.module_code === moduleCode
      );

      if (existing) {
        return await base44.entities.OrganizationModuleAccess.update(existing.id, {
          is_enabled: isEnabled,
          enabled_at: isEnabled ? new Date().toISOString() : existing.enabled_at,
        });
      } else {
        return await base44.entities.OrganizationModuleAccess.create({
          organization_id: orgId,
          module_code: moduleCode,
          is_enabled: isEnabled,
          enabled_at: new Date().toISOString(),
          license_type: 'full'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orgModuleAccess']);
      toast.success('Module access updated');
    },
  });

  const isModuleEnabledForOrg = (orgId, moduleCode) => {
    const access = orgModuleAccess.find(
      oma => oma.organization_id === orgId && oma.module_code === moduleCode
    );
    return access?.is_enabled || false;
  };

  const getEnabledModulesForCompany = (companyId) => {
    return companyModuleAccess.filter(cma => cma.company_id === companyId && cma.is_enabled);
  };

  const resetForm = () => {
    setFormData({
      name: '', code: '', type: 'clinic', country_code: '',
      address: '', phone: '', email: '', tax_id: '',
      license_number: '', status: 'active'
    });
    setEditingOrg(null);
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData(org);
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

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
            <h1 className="text-3xl font-bold text-slate-900">Organizations</h1>
            <p className="text-slate-500 mt-1">{organizations.length} organizations</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Card key={org.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <Badge variant="outline" className={`${statusColors[org.status]} border`}>
                  {org.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{org.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{org.code} • {org.type}</p>
              {org.country_code && (
                <p className="text-sm text-slate-500 mb-3">Country: {org.country_code}</p>
              )}

              {/* Module Access */}
              {org.company_id && (
                <div className="mb-3 pt-3 border-t">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Modules
                  </h4>
                  <div className="space-y-1">
                    {getEnabledModulesForCompany(org.company_id).map(cma => {
                      const module = modules.find(m => m.module_code === cma.module_code);
                      if (!module) return null;
                      
                      return (
                        <div key={module.module_code} className="flex items-center justify-between p-1.5 rounded border bg-slate-50 text-xs">
                          <span className="text-slate-700">{module.module_name}</span>
                          <Switch
                            checked={isModuleEnabledForOrg(org.id, module.module_code)}
                            onCheckedChange={(checked) => {
                              toggleOrgModuleMutation.mutate({
                                orgId: org.id,
                                moduleCode: module.module_code,
                                isEnabled: checked
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                    {getEnabledModulesForCompany(org.company_id).length === 0 && (
                      <p className="text-xs text-slate-400 italic">No modules enabled</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(org)} className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(org.id)} className="text-rose-600 hover:text-rose-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit Organization' : 'Add Organization'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div className="space-y-2">
                <Label>Country Code</Label>
                <Input value={formData.country_code} onChange={(e) => setFormData({...formData, country_code: e.target.value})} placeholder="US, CA, IN, SG" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tax ID</Label>
                <Input value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingOrg ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}