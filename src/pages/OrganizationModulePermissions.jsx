import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Building2, Lock, Unlock, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrganizationModulePermissions() {
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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

  // Only show optional modules (not core/system modules)
  const optionalModules = modules.filter(m => 
    ['PHARMACY', 'HOME_CARE', 'CLINICAL', 'LABORATORY', 'DIAGNOSTICS', 'AI_ASSISTANT'].includes(m.module_code)
  );

  const isModuleEnabledForOrg = (companyId, moduleCode) => {
    const access = companyModuleAccess.find(
      cma => cma.company_id === companyId && cma.module_code === moduleCode
    );
    return access?.is_enabled || false;
  };

  const toggleModuleMutation = useMutation({
    mutationFn: async ({ companyId, moduleCode, isEnabled }) => {
      const existing = companyModuleAccess.find(
        cma => cma.company_id === companyId && cma.module_code === moduleCode
      );

      if (existing) {
        return await base44.entities.CompanyModuleAccess.update(existing.id, {
          is_enabled: isEnabled,
          enabled_at: isEnabled ? new Date().toISOString() : existing.enabled_at,
          enabled_by: user?.id
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
      queryClient.invalidateQueries({ queryKey: ['companyModuleAccess'] });
      toast.success('Module access updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Organization Module Permissions</h1>
              <p className="text-purple-100 mt-1">Control which features each organization can access</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => setSelectedOrg(org)}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedOrg?.id === org.id
                ? 'border-purple-500 bg-purple-50 shadow-lg'
                : 'border-slate-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-slate-600" />
              <h3 className="font-bold text-slate-900">{org.name}</h3>
            </div>
            <p className="text-xs text-slate-600">{org.type || 'clinic'}</p>
            {selectedOrg?.id === org.id && (
              <Badge className="mt-2 bg-purple-600">Selected</Badge>
            )}
          </button>
        ))}
      </div>

      {selectedOrg && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Package className="w-6 h-6 text-purple-600" />
                  {selectedOrg.name} - Module Access
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">Toggle modules ON to allow this organization to use them</p>
              </div>
              <Unlock className="w-8 h-8 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {optionalModules.map((module) => {
                const isEnabled = isModuleEnabledForOrg(selectedOrg.company_id || selectedOrg.id, module.module_code);
                return (
                  <div
                    key={module.module_code}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isEnabled
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{module.module_name}</p>
                        <p className="text-xs text-slate-600 mt-1">{module.description || 'Module access'}</p>
                        {isEnabled && (
                          <Badge className="mt-2 bg-green-600">Enabled</Badge>
                        )}
                        {!isEnabled && (
                          <Badge variant="outline" className="mt-2 border-slate-300">Disabled</Badge>
                        )}
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          toggleModuleMutation.mutate({
                            companyId: selectedOrg.company_id || selectedOrg.id,
                            moduleCode: module.module_code,
                            isEnabled: checked
                          });
                        }}
                        disabled={toggleModuleMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedOrg && (
        <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
          <CardContent className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-semibold text-lg">Select an organization above to manage module access</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}