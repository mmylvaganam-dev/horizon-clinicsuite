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
import { Building2, Plus, Edit, Package, Lock, Mail, MessageSquare, Info, ExternalLink } from 'lucide-react';
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
    email_domain: '',
    sms_api_provider: 'none',
    sms_api_key: '',
    sms_api_secret: '',
    sms_sender_id: '',
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
  }) || user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
     user?.email === 'madhawaekanayake@gmail.com' ||
     user?.is_platform_owner === true;

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isPlatformOwner,
  });

  // Check if user is platform owner by email
  const isPlatformOwnerByEmail = isPlatformOwner || 
    ['mylvaganam@premierhealthcanada.ca', 'mmylvaganam@premierhealthcanada.ca', 'madhawaekanayake@gmail.com'].includes(user?.email);

  const toggleCompanyStatusMutation = useMutation({
    mutationFn: async ({ companyId, newStatus }) => {
      // Update company status
      await base44.entities.CompanyProfile.update(companyId, { status: newStatus });
      
      // Manually cascade to all linked organizations immediately
      const linkedOrgs = organizations.filter(org => org.company_id === companyId);
      for (const org of linkedOrgs) {
        await base44.entities.Organization.update(org.id, { status: newStatus });
      }
      
      return { updated: linkedOrgs.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['allOrganizations'] });
      toast.success(`Company status updated - ${result.updated} organization${result.updated !== 1 ? 's' : ''} updated`);
    },
  });

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
        email_domain: '',
        sms_api_provider: 'none',
        sms_api_key: '',
        sms_api_secret: '',
        sms_sender_id: '',
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
      email_domain: company.email_domain || '',
      sms_api_provider: company.sms_api_provider || 'none',
      sms_api_key: company.sms_api_key || '',
      sms_api_secret: company.sms_api_secret || '',
      sms_sender_id: company.sms_sender_id || '',
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

  // Show ALL non-core active modules — new modules automatically appear here
  const optionalModules = modules.filter(m => m.status === 'active' && !m.is_core);

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
          {companies.map((company) => {
            const linkedOrgs = organizations.filter(org => org.company_id === company.id);
            return (
            <Card
              key={company.id}
              className="p-6 rounded-2xl border-4 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-xl text-slate-900">{company.company_legal_name}</h3>
                  </div>
                  {company.company_trade_name && (
                    <p className="text-sm text-blue-700 font-semibold mb-2">DBA: {company.company_trade_name}</p>
                  )}
                  
                  {/* PROMINENT ON/OFF SWITCH */}
                  <div className="mt-4 p-4 rounded-xl border-4 border-slate-300 bg-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg text-slate-900">Company Status</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {linkedOrgs.length} organization{linkedOrgs.length !== 1 ? 's' : ''} linked
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = company.status === 'active' ? 'inactive' : 'active';
                          toggleCompanyStatusMutation.mutate({ companyId: company.id, newStatus });
                        }}
                        disabled={toggleCompanyStatusMutation.isPending}
                        className={`relative w-28 h-14 rounded-full transition-all duration-300 shadow-2xl transform hover:scale-110 ${
                          company.status === 'active'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gradient-to-r from-red-500 to-rose-600'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-12 h-12 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                          company.status === 'active' ? 'translate-x-14' : 'translate-x-0'
                        }`} />
                        <span className={`absolute inset-0 flex items-center justify-center font-black text-sm text-white ${
                          company.status === 'active' ? 'pl-4' : 'pr-4'
                        }`}>
                          {company.status === 'active' ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                    {company.status === 'inactive' && (
                      <p className="text-xs text-red-600 font-bold mt-2 bg-red-50 p-2 rounded border-2 border-red-200">
                        ⚠️ All linked organizations are hidden and deactivated
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleEdit(company)}
                    className="mt-3 w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit Details
                  </button>
                  
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
              <div className="mt-4 pt-4 border-t-4 border-indigo-300">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-base">Billable Modules</h4>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">Platform Owner</span>
                </div>
                {company.status !== 'active' && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                    ⚠️ Activate company first to enable modules
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {optionalModules.map(module => {
                    const enabled = isModuleEnabledForCompany(company.id, module.module_code);
                    return (
                      <div key={module.module_code} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        enabled ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
                      }`}>
                        <div>
                          <p className={`text-sm font-semibold ${enabled ? 'text-emerald-800' : 'text-slate-700'}`}>{module.module_name}</p>
                          {module.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{module.description}</p>
                          )}
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => {
                            toggleCompanyModuleMutation.mutate({
                              companyId: company.id,
                              moduleCode: module.module_code,
                              isEnabled: checked
                            });
                          }}
                          disabled={company.status !== 'active' || toggleCompanyModuleMutation.isPending}
                        />
                      </div>
                    );
                  })}
                  {optionalModules.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No modules available. Seed modules first.</p>
                  )}
                </div>
              </div>
            </Card>
          );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
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

            <div className="border-t-2 border-slate-200 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-slate-900">Email Configuration</h3>
              </div>

              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-bold text-emerald-900 mb-2">📧 Direct Domain Email Setup (No Third-Party Service Needed)</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border-2 border-emerald-300 space-y-3">
                      <p className="font-bold text-emerald-900 text-base">STEP 1: Setup DNS Records at Your Domain Provider</p>
                      <div className="pl-4 space-y-2">
                        <p className="text-slate-700">→ Login to your domain provider (GoDaddy, Namecheap, Google Domains, Bluehost, etc.)</p>
                        <p className="text-slate-700">→ Find "DNS Management", "DNS Settings", or "Advanced DNS" option</p>
                        <p className="text-slate-700">→ Add these 3 TXT records for email validation:</p>
                        <div className="bg-slate-100 p-3 rounded text-xs font-mono space-y-1 ml-4">
                          <div className="text-green-700 font-bold">Record 1: SPF (Sender Policy Framework)</div>
                          <div className="p-1 bg-white rounded">Type: TXT | Name: @ | Value: v=spf1 include:horizon-clinic.com ~all</div>
                          <div className="text-green-700 font-bold mt-2">Record 2: DKIM (Domain Keys)</div>
                          <div className="p-1 bg-white rounded">Type: TXT | Name: default._domainkey | Value: v=DKIM1; p=YOUR_DKIM_KEY</div>
                          <div className="text-green-700 font-bold mt-2">Record 3: DMARC (Authentication Policy)</div>
                          <div className="p-1 bg-white rounded">Type: TXT | Name: _dmarc | Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com</div>
                        </div>
                        <p className="text-slate-700">→ Click Save/Add Records</p>
                        <p className="text-slate-700">→ Wait 15-30 minutes for DNS propagation</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border-2 border-blue-300 space-y-3">
                      <p className="font-bold text-blue-900 text-base">STEP 2: Add Mail Server Records (Optional - For Your Own Mail Server)</p>
                      <div className="pl-4 space-y-2">
                        <p className="text-slate-700">→ If you use your own mail server, add MX record:</p>
                        <div className="bg-slate-100 p-3 rounded text-xs font-mono space-y-1 ml-4">
                          <div className="p-1 bg-white rounded">Type: MX | Name: @ | Value: mail.yourdomain.com | Priority: 10</div>
                        </div>
                        <p className="text-slate-700 text-xs">Skip this if using cloud email (Gmail, Office 365, Zoho)</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border-2 border-purple-300 space-y-3">
                      <p className="font-bold text-purple-900 text-base">STEP 3: Configure Email in This App</p>
                      <div className="pl-4 space-y-2">
                        <p className="text-slate-700">→ Fill in the Email Domain field below with your domain</p>
                        <p className="text-slate-700">→ Example: anantham.lk</p>
                        <p className="text-slate-700">→ Emails will send from: noreply@anantham.lk or bill@anantham.lk</p>
                        <p className="text-slate-700">→ Save the company profile</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-3">
                      <p className="font-bold text-blue-900 mb-1">💡 How It Works:</p>
                      <ul className="text-blue-800 space-y-1 text-xs list-disc list-inside">
                        <li>The app sends emails directly from your domain using DNS records</li>
                        <li>No need for Resend, SendGrid, or other third-party services</li>
                        <li>DNS records tell email servers to trust emails from your domain</li>
                        <li>SPF, DKIM, DMARC prevent email spoofing and improve delivery</li>
                      </ul>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded p-3">
                      <p className="font-bold text-amber-900 mb-1">⚠️ Important Notes:</p>
                      <ul className="text-amber-800 space-y-1 text-xs list-disc list-inside">
                        <li>Do NOT modify CNAME or A records - only add TXT records</li>
                        <li>DNS changes take 15-30 minutes to propagate globally</li>
                        <li>Enter your exact domain name (e.g., anantham.lk, NOT www.anantham.lk)</li>
                        <li>Test sending a test email after setup to verify it works</li>
                      </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="font-bold text-red-900 mb-1">❌ Troubleshooting:</p>
                      <ul className="text-red-800 space-y-1 text-xs list-disc list-inside">
                        <li><strong>Emails going to spam?</strong> Check SPF/DKIM/DMARC records are correctly added</li>
                        <li><strong>Emails not sending?</strong> Verify DNS records are saved, wait 30 minutes</li>
                        <li><strong>DNS changes not working?</strong> Clear browser cache and try different DNS checker</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Email Domain (After DNS Setup)</Label>
                <Input
                  value={formData.email_domain}
                  onChange={(e) => setFormData({...formData, email_domain: e.target.value})}
                  placeholder="yourcompany.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Your verified domain - emails will be sent from bill@{formData.email_domain || 'yourdomain.com'}
                </p>
              </div>
            </div>

            <div className="border-t-2 border-slate-200 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-lg text-slate-900">SMS Configuration</h3>
                <div className="group relative">
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                  <div className="hidden group-hover:block absolute left-0 top-6 w-96 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50">
                    <p className="font-bold mb-2">📱 SMS Setup Instructions</p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold text-blue-300">Twilio:</p>
                        <p>1. Sign up at <a href="https://www.twilio.com" target="_blank" className="text-blue-400 underline">twilio.com</a></p>
                        <p>2. Get Account SID (API Key) and Auth Token (API Secret)</p>
                        <p>3. Purchase a phone number (Sender ID)</p>
                      </div>
                      <div>
                        <p className="font-semibold text-green-300">Dialog (Sri Lanka):</p>
                        <p>1. Contact Dialog for SMS API access</p>
                        <p>2. Get API credentials and sender ID</p>
                      </div>
                      <div>
                        <p className="font-semibold text-orange-300">Mobitel (Sri Lanka):</p>
                        <p>1. Contact Mobitel for SMS gateway</p>
                        <p>2. Obtain API credentials</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>SMS Provider</Label>
                  <Select value={formData.sms_api_provider} onValueChange={(value) => setFormData({...formData, sms_api_provider: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (SMS Disabled)</SelectItem>
                      <SelectItem value="twilio">Twilio (Global)</SelectItem>
                      <SelectItem value="dialog">Dialog (Sri Lanka)</SelectItem>
                      <SelectItem value="mobitel">Mobitel (Sri Lanka)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.sms_api_provider !== 'none' && (
                  <>
                    <div>
                      <Label>API Key / Account SID</Label>
                      <Input
                        value={formData.sms_api_key}
                        onChange={(e) => setFormData({...formData, sms_api_key: e.target.value})}
                        placeholder="Enter API Key"
                        type="password"
                      />
                    </div>

                    <div>
                      <Label>API Secret / Auth Token</Label>
                      <Input
                        value={formData.sms_api_secret}
                        onChange={(e) => setFormData({...formData, sms_api_secret: e.target.value})}
                        placeholder="Enter API Secret"
                        type="password"
                      />
                    </div>

                    <div>
                      <Label>Sender ID / Phone Number</Label>
                      <Input
                        value={formData.sms_sender_id}
                        onChange={(e) => setFormData({...formData, sms_sender_id: e.target.value})}
                        placeholder={formData.sms_api_provider === 'twilio' ? '+1234567890' : 'YourBrand'}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.sms_api_provider === 'twilio' 
                          ? 'Your Twilio phone number (e.g., +1234567890)'
                          : 'Your approved sender name'}
                      </p>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">Setup Guide:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Create an account with your SMS provider</li>
                            <li>Copy API credentials to the fields above</li>
                            <li>Test SMS sending from the system</li>
                            <li>Monitor usage and costs in provider dashboard</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t-2 border-red-200 pt-4 mt-4 bg-red-50 p-4 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <Info className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900">Important: Company Status</p>
                  <p className="text-xs text-red-700 mt-1">Use the ON/OFF switch on the company card to change status. Setting to OFF will automatically deactivate all linked organizations.</p>
                </div>
              </div>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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