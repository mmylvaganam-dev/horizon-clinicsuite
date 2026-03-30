import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Package, CheckCircle, XCircle, ArrowRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const PLATFORM_OWNER_EMAILS = ['mmylvaganam@premierhealthcanada.ca', 'mylvaganam@premierhealthcanada.ca'];

export default function CompanyModuleManagement() {
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPlatformOwner = PLATFORM_OWNER_EMAILS.includes(user?.email) || user?.is_platform_owner === true;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
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

  const toggleCompanyModuleMutation = useMutation({
    mutationFn: async ({ companyId, moduleCode, isEnabled }) => {
      const existing = companyModuleAccess.find(
        cma => cma.company_id === companyId && cma.module_code === moduleCode
      );

      if (existing) {
        return await base44.entities.CompanyModuleAccess.update(existing.id, {
          is_enabled: isEnabled,
          enabled_at: isEnabled ? new Date().toISOString() : existing.enabled_at,
          enabled_by: isEnabled ? user.id : existing.enabled_by
        });
      } else {
        return await base44.entities.CompanyModuleAccess.create({
          company_id: companyId,
          module_code: moduleCode,
          is_enabled: isEnabled,
          enabled_at: new Date().toISOString(),
          enabled_by: user.id,
          license_type: 'full'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companyModuleAccess']);
      toast.success('Company module access updated');
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
          enabled_by: isEnabled ? user.id : existing.enabled_by
        });
      } else {
        return await base44.entities.OrganizationModuleAccess.create({
          organization_id: orgId,
          module_code: moduleCode,
          is_enabled: isEnabled,
          enabled_at: new Date().toISOString(),
          enabled_by: user.id,
          license_type: 'full'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orgModuleAccess']);
      toast.success('Organization module access updated');
    },
  });

  const isModuleEnabledForCompany = (companyId, moduleCode) => {
    const access = companyModuleAccess.find(
      cma => cma.company_id === companyId && cma.module_code === moduleCode
    );
    return access?.is_enabled || false;
  };

  const isModuleEnabledForOrg = (orgId, moduleCode) => {
    const access = orgModuleAccess.find(
      oma => oma.organization_id === orgId && oma.module_code === moduleCode
    );
    return access?.is_enabled || false;
  };

  const getCompanyOrgs = (companyId) => {
    return organizations.filter(org => org.company_id === companyId);
  };

  const getEnabledModulesCount = (companyId) => {
    return companyModuleAccess.filter(
      cma => cma.company_id === companyId && cma.is_enabled
    ).length;
  };

  // Business modules that can be toggled (all non-core modules regardless of status field)
  const businessModules = modules.filter(m => !m.is_core);

  if (user && !isPlatformOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Platform Owner Only</h2>
          <p className="text-slate-600">Company module management is restricted to platform owners only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Package className="w-10 h-10" />
          Module Access Management
        </h1>
        <p className="text-indigo-100 mt-2 text-lg">Control module access at company and organization levels</p>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Company Level Access</TabsTrigger>
          <TabsTrigger value="organizations">Organization Level Access</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <div className="grid gap-4">
            {companies.map(company => {
              const companyOrgs = getCompanyOrgs(company.id);
              const enabledCount = getEnabledModulesCount(company.id);

              return (
                <Card key={company.id} className="border-2">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{company.company_legal_name}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          {companyOrgs.length} organizations • {enabledCount} modules enabled
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        {company.company_code}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Core Modules (Always Available)</h4>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> New Sale
                          </Badge>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Patient Hub
                          </Badge>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Reports
                          </Badge>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Communication
                          </Badge>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Administration
                          </Badge>
                        </div>
                      </div>

                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Optional Modules</h4>
                      {businessModules.map(module => {
                        const isEnabled = isModuleEnabledForCompany(company.id, module.module_code);
                        
                        return (
                          <div key={module.module_code} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-slate-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900">{module.module_name}</p>
                                <Badge variant="outline" className="text-xs">{module.category}</Badge>
                              </div>
                              <p className="text-sm text-slate-600">{module.description}</p>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => {
                                toggleCompanyModuleMutation.mutate({
                                  companyId: company.id,
                                  moduleCode: module.module_code,
                                  isEnabled: checked
                                });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-2">
              <CardHeader className="bg-slate-50">
                <CardTitle className="text-lg">Select Company</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {companies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => setSelectedCompany(company)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedCompany?.id === company.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{company.company_legal_name}</p>
                          <p className="text-sm text-slate-600">
                            {getCompanyOrgs(company.id).length} organizations
                          </p>
                        </div>
                        {selectedCompany?.id === company.id && (
                          <ArrowRight className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-slate-50">
                <CardTitle className="text-lg">
                  {selectedCompany ? `Organizations under ${selectedCompany.company_legal_name}` : 'Select a company'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {!selectedCompany ? (
                  <p className="text-slate-500 text-center py-8">Select a company to manage organization modules</p>
                ) : (
                  <div className="space-y-4">
                    {getCompanyOrgs(selectedCompany.id).map(org => {
                      const enabledCompanyModules = companyModuleAccess.filter(
                        cma => cma.company_id === selectedCompany.id && cma.is_enabled
                      );

                      return (
                        <Card key={org.id} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{org.name}</CardTitle>
                              <Badge variant="outline">{org.code}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {enabledCompanyModules.length === 0 ? (
                              <p className="text-sm text-slate-500 py-2">No modules enabled at company level</p>
                            ) : (
                              enabledCompanyModules.map(cma => {
                                const module = modules.find(m => m.module_code === cma.module_code);
                                if (!module) return null;

                                const isOrgEnabled = isModuleEnabledForOrg(org.id, module.module_code);

                                return (
                                  <div key={module.module_code} className="flex items-center justify-between p-2 rounded border bg-white">
                                    <p className="text-sm font-medium text-slate-900">{module.module_name}</p>
                                    <Switch
                                      checked={isOrgEnabled}
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
                              })
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {getCompanyOrgs(selectedCompany.id).length === 0 && (
                      <p className="text-slate-500 text-center py-8">No organizations found for this company</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}