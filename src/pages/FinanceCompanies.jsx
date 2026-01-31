import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit, Package, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

export default function FinanceCompanies() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [orgFormData, setOrgFormData] = useState({
    company_id: '',
    name: '',
    code: '',
    type: 'clinic',
    status: 'active'
  });
  const [formData, setFormData] = useState({
    company_code: '',
    company_legal_name: '',
    company_trade_name: '',
    country_code: '',
    incorporation_number: '',
    fiscal_year_end: '',
    base_currency: 'USD',
    status: 'active'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list('-created_date'),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list(),
  });

  const { data: companyModuleAccess = [] } = useQuery({
    queryKey: ['companyModuleAccess'],
    queryFn: () => base44.entities.CompanyModuleAccess.list(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: user.id });
      return roles;
    },
    enabled: !!user,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'PLATFORM_OWNER';
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isPlatformOwner,
  });

  // Check if user is platform owner by email
  const isPlatformOwnerByEmail = ['mylvaganam@premierhealthcanada.ca', 'mmylvaganam@premierhealthcanada.ca'].includes(user?.email);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const company = editingCompany
        ? await base44.entities.CompanyProfile.update(editingCompany.id, data)
        : await base44.entities.CompanyProfile.create({
            ...data,
            organization_id: user?.organization_id || ''
          });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user?.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'FINANCE_CONTROL_TOWER',
        action: editingCompany ? 'update_company' : 'create_company',
        record_type: 'CompanyProfile',
        record_id: company.id,
        metadata: {}
      });

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
      setEditingCompany(null);
      setFormData({
        company_code: '',
        company_legal_name: '',
        company_trade_name: '',
        country_code: '',
        incorporation_number: '',
        fiscal_year_end: '',
        base_currency: 'LKR',
        status: 'active'
      });
      toast.success(editingCompany ? 'Company updated' : 'Company created');
    },
  });

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      company_code: company.company_code || '',
      company_legal_name: company.company_legal_name,
      company_trade_name: company.company_trade_name || '',
      country_code: company.country_code,
      incorporation_number: company.incorporation_number || '',
      fiscal_year_end: company.fiscal_year_end || '',
      base_currency: company.base_currency,
      status: company.status
    });
    setDialogOpen(true);
  };

  const toggleCompanyModuleMutation = useMutation({
    mutationFn: async ({ companyId, moduleCode, isEnabled }) => {
      const existing = companyModuleAccess.find(
        cma => cma.company_id === companyId && cma.module_code === moduleCode
      );

      if (existing) {
        return await base44.entities.CompanyModuleAccess.update(existing.id, {
          is_enabled: isEnabled,
          enabled_at: isEnabled ? new Date().toISOString() : existing.enabled_at,
          enabled_by: isEnabled ? user?.id : existing.enabled_by
        });
      } else {
        return await base44.entities.CompanyModuleAccess.create({
          company_id: companyId,
          module_code: moduleCode,
          is_enabled: isEnabled,
          enabled_at: new Date().toISOString(),
          enabled_by: user?.id,
          license_type: 'full'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companyModuleAccess']);
      toast.success('Module access updated');
    },
  });

  const isModuleEnabledForCompany = (companyId, moduleCode) => {
    const access = companyModuleAccess.find(
      cma => cma.company_id === companyId && cma.module_code === moduleCode
    );
    return access?.is_enabled || false;
  };

  // Only show the key optional modules (home care, clinical, lab, diagnostics, AI, pharmacy)
  const optionalModules = modules.filter(m => 
    ['PHARMACY', 'HOME_CARE', 'CLINICAL', 'LABORATORY', 'DIAGNOSTICS', 'AI_ASSISTANT'].includes(m.module_code)
  );

  const saveOrgMutation = useMutation({
    mutationFn: async (data) => {
      const org = editingOrg
        ? await base44.entities.Organization.update(editingOrg.id, data)
        : await base44.entities.Organization.create(data);

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: org.id,
        location_id: '',
        patient_id: '',
        module: 'ADMIN_COMPANY',
        action: editingOrg ? 'update_organization' : 'create_organization',
        record_type: 'Organization',
        record_id: org.id,
        metadata: {}
      });

      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setOrgDialogOpen(false);
      setEditingOrg(null);
      setOrgFormData({
        company_id: '',
        name: '',
        code: '',
        type: 'clinic',
        status: 'active'
      });
      toast.success(editingOrg ? 'Organization updated' : 'Organization created');
    },
  });

  const handleEditOrg = (org) => {
    setEditingOrg(org);
    setOrgFormData({
      company_id: org.company_id || '',
      name: org.name,
      code: org.code,
      type: org.type || 'clinic',
      status: org.status
    });
    setOrgDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Building2 className="w-10 h-10" />
              Company Profiles
            </h1>
            <p className="text-blue-100 mt-2 text-lg">Manage your company entities and organizations</p>
          </div>
          {isPlatformOwnerByEmail && (
            <button
              onClick={() => setDialogOpen(true)}
              className="px-6 py-4 bg-white text-blue-600 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Add Company
            </button>
          )}
          {!isPlatformOwnerByEmail && (
            <div className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-semibold text-lg cursor-not-allowed">
              <Lock className="w-5 h-5 inline mr-2" />
              Platform Owner Only
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="border-4 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="text-center py-16">
            <Building2 className="w-20 h-20 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-xl font-semibold">No companies yet</p>
            <p className="text-slate-400 mt-2">Click "Add Company" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleEdit(company)}
              className="p-6 rounded-2xl border-4 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-2xl transition-all duration-300 text-left transform hover:scale-102 hover:border-blue-400"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl transform hover:rotate-3 transition-transform">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-xl text-slate-900">{company.company_legal_name}</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      company.status === 'active' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-400 text-white'
                    }`}>
                      {company.status.toUpperCase()}
                    </div>
                  </div>
                  {company.company_trade_name && (
                    <p className="text-sm text-blue-700 font-semibold mb-2">DBA: {company.company_trade_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                      {company.country_code}
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {company.base_currency}
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
                      Code: {company.company_code}
                    </div>
                    {company.incorporation_number && (
                      <div className="px-3 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold">
                        Reg: {company.incorporation_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Module Access Section */}
              <div className="mt-4 pt-4 border-t-2 border-blue-200">
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Module Access
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {optionalModules.map(module => (
                    <div key={module.module_code} className="flex items-center justify-between p-2 rounded-lg border-2 border-slate-200 bg-white">
                      <span className="text-sm font-medium text-slate-700">{module.module_name}</span>
                      <Switch
                        checked={isModuleEnabledForCompany(company.id, module.module_code)}
                        onCheckedChange={(checked) => {
                          toggleCompanyModuleMutation.mutate({
                            companyId: company.id,
                            moduleCode: module.module_code,
                            isEnabled: checked
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add Company'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Code *</Label>
              <Input
                value={formData.company_code}
                onChange={(e) => setFormData({...formData, company_code: e.target.value.toUpperCase()})}
                placeholder="2-3 letter code (e.g., AR, HC)"
                maxLength={3}
              />
              <p className="text-xs text-slate-500 mt-1">Used as PHN prefix and identifiers</p>
            </div>

            <div>
              <Label>Legal Name *</Label>
              <Input
                value={formData.company_legal_name}
                onChange={(e) => setFormData({...formData, company_legal_name: e.target.value})}
                placeholder="Legal company name"
              />
            </div>

            <div>
              <Label>Trade Name (DBA)</Label>
              <Input
                value={formData.company_trade_name}
                onChange={(e) => setFormData({...formData, company_trade_name: e.target.value})}
                placeholder="Doing business as..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country Code *</Label>
                <Select value={formData.country_code} onValueChange={(value) => setFormData({...formData, country_code: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States (US)</SelectItem>
                    <SelectItem value="CA">Canada (CA)</SelectItem>
                    <SelectItem value="UK">United Kingdom (UK)</SelectItem>
                    <SelectItem value="AU">Australia (AU)</SelectItem>
                    <SelectItem value="LK">Sri Lanka (LK)</SelectItem>
                    <SelectItem value="IN">India (IN)</SelectItem>
                    <SelectItem value="AE">UAE (AE)</SelectItem>
                    <SelectItem value="SG">Singapore (SG)</SelectItem>
                    <SelectItem value="MY">Malaysia (MY)</SelectItem>
                    <SelectItem value="PK">Pakistan (PK)</SelectItem>
                    <SelectItem value="BD">Bangladesh (BD)</SelectItem>
                    <SelectItem value="NZ">New Zealand (NZ)</SelectItem>
                    <SelectItem value="ZA">South Africa (ZA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Base Currency *</Label>
                <Select value={formData.base_currency} onValueChange={(value) => setFormData({...formData, base_currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                    <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Incorporation Number</Label>
              <Input
                value={formData.incorporation_number}
                onChange={(e) => setFormData({...formData, incorporation_number: e.target.value})}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label>Fiscal Year End (MM-DD)</Label>
              <Input
                value={formData.fiscal_year_end}
                onChange={(e) => setFormData({...formData, fiscal_year_end: e.target.value})}
                placeholder="12-31"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setDialogOpen(false);
                setEditingCompany(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.company_code || !formData.company_legal_name || !formData.country_code || saveMutation.isPending}
              >
                {editingCompany ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isPlatformOwnerByEmail && (
       <>
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <Building2 className="w-8 h-8" />
                  Organization Profiles
                </h2>
                <p className="text-teal-100 mt-2">Manage clinic and hospital organizations</p>
              </div>
              <button
                onClick={() => {
                  setEditingOrg(null);
                  setOrgFormData({
                    company_id: '',
                    name: '',
                    code: '',
                    type: 'clinic',
                    status: 'active'
                  });
                  setOrgDialogOpen(true);
                }}
                className="px-6 py-4 bg-white text-teal-600 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Add Organization
              </button>
            </div>
          </div>

          {organizations.length === 0 ? (
            <Card className="border-4 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50">
              <CardContent className="text-center py-16">
                <Building2 className="w-20 h-20 mx-auto text-teal-300 mb-4" />
                <p className="text-teal-600 text-xl font-semibold">No organizations yet</p>
                <p className="text-teal-500 mt-2">Click "Add Organization" to create one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleEditOrg(org)}
                  className="p-6 rounded-2xl border-4 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 hover:shadow-2xl transition-all duration-300 text-left transform hover:scale-102 hover:border-teal-400"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl transform hover:rotate-3 transition-transform">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-xl text-slate-900">{org.name}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          org.status === 'active' 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-400 text-white'
                        }`}>
                          {org.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="px-3 py-1 rounded-lg bg-teal-100 text-teal-700 text-xs font-bold uppercase">
                          {org.type || 'clinic'}
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
                          Code: {org.code}
                        </div>
                        {org.company_id && (
                          <div className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                            {companies.find(c => c.id === org.company_id)?.company_code || 'N/A'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit Organization' : 'Add Organization'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company *</Label>
              <Select value={orgFormData.company_id} onValueChange={(value) => setOrgFormData({...orgFormData, company_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.company_legal_name} ({company.company_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Organization Name *</Label>
              <Input
                value={orgFormData.name}
                onChange={(e) => setOrgFormData({...orgFormData, name: e.target.value})}
                placeholder="Organization name"
              />
            </div>

            <div>
              <Label>Code *</Label>
              <Input
                value={orgFormData.code}
                onChange={(e) => setOrgFormData({...orgFormData, code: e.target.value})}
                placeholder="Unique code"
                disabled={!!editingOrg}
              />
              {editingOrg && <p className="text-xs text-slate-500 mt-1">Code cannot be changed</p>}
            </div>

            <div>
              <Label>Type</Label>
              <Select value={orgFormData.type} onValueChange={(value) => setOrgFormData({...orgFormData, type: value})}>
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
              <Select value={orgFormData.status} onValueChange={(value) => setOrgFormData({...orgFormData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setOrgDialogOpen(false);
                setEditingOrg(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => saveOrgMutation.mutate(orgFormData)}
                disabled={!orgFormData.company_id || !orgFormData.name || !orgFormData.code || saveOrgMutation.isPending}
              >
                {editingOrg ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      );
      }