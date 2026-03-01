import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, Lock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

const MODULE_GROUPS = {
  'Dashboards': ['DASHBOARD', 'SALES_WORKSPACE'],
  'Clinical': ['EMR', 'PMS', 'CLINICAL', 'APPOINTMENTS', 'ORDERS_RESULTS', 'PRESCRIPTIONS'],
  'Telemedicine': ['TELEMEDICINE'],
  'Dental': ['DENTAL'],
  'Lab': ['LIS', 'LABORATORY'],
  'Diagnostics': ['DIAGNOSTICS', 'CARDIO', 'PFT', 'RADIOLOGY'],
  'Pharmacy': ['PHARMACY', 'INVENTORY'],
  'Home Care': ['HOME_CARE'],
  'Queue': ['QUEUE_MGMT'],
  'Finance': ['BILLING', 'ACCOUNTING', 'FINANCE', 'FINANCE_CONTROL_TOWER'],
  'HR & Payroll': ['HR_PAYROLL'],
  'Engagement': ['ENGAGE_PORTAL', 'COMMUNICATIONS'],
  'Reports': ['REPORTS', 'AI_ASSISTANT', 'GOVERNMENT_REPORTING', 'PARTNER'],
  'Wholesale': ['WHOLESALE_PHARMA'],
  'Telephony': ['TELEPHONY'],
  'Administration': ['ADMIN', 'USER_ADMIN', 'BRANDING']
};

export default function AdminModuleToggles() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState('');

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

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list(),
    enabled: canAccess,
  });

  const { data: globalAvailability = [] } = useQuery({
    queryKey: ['globalAvailability'],
    queryFn: () => base44.entities.GlobalModuleAvailability.list(),
    enabled: isPlatformOwner,
  });

  const { data: orgModuleAccess = [] } = useQuery({
    queryKey: ['orgModuleAccess', selectedOrg],
    queryFn: () => base44.entities.OrganizationModuleAccess.filter({ organization_id: selectedOrg }),
    enabled: !!selectedOrg,
  });

  const { data: togglePermissions = [] } = useQuery({
    queryKey: ['togglePermissions', selectedOrg],
    queryFn: () => base44.entities.OrgModuleTogglePermission.filter({ organization_id: selectedOrg }),
    enabled: !!selectedOrg,
  });

  const toggleGlobalMutation = useMutation({
    mutationFn: async ({ module_code, enabled }) => {
      const existing = globalAvailability.find(g => g.module_code === module_code);
      const data = {
        module_code,
        is_globally_enabled: enabled,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id,
        updated_by_email: currentUser.email
      };

      let result;
      if (existing) {
        result = await base44.entities.GlobalModuleAvailability.update(existing.id, data);
      } else {
        result = await base44.entities.GlobalModuleAvailability.create(data);
      }

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'MODULE_TOGGLE',
        action: enabled ? 'enable_global' : 'disable_global',
        record_type: 'GlobalModuleAvailability',
        record_id: result.id,
        metadata: { module_code }
      });
      return result;
    },
    onMutate: async ({ module_code, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['globalAvailability'] });
      const previous = queryClient.getQueryData(['globalAvailability']);
      queryClient.setQueryData(['globalAvailability'], (old = []) => {
        const existing = old.find(g => g.module_code === module_code);
        if (existing) {
          return old.map(g => g.module_code === module_code ? { ...g, is_globally_enabled: enabled } : g);
        }
        return [...old, { module_code, is_globally_enabled: enabled, id: `optimistic-${module_code}` }];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['globalAvailability'], context.previous);
      toast.error('Failed to update global module');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalAvailability'] });
      toast.success('Global module updated');
    },
  });

  const toggleOrgMutation = useMutation({
    mutationFn: async ({ module_code, enabled }) => {
      const existing = orgModuleAccess.find(a => a.module_code === module_code);
      const data = {
        organization_id: selectedOrg,
        module_code,
        is_enabled: enabled,
        enabled_by: currentUser.id,
        enabled_at: new Date().toISOString()
      };

      let result;
      if (existing) {
        result = await base44.entities.OrganizationModuleAccess.update(existing.id, { ...data, id: existing.id });
      } else {
        result = await base44.entities.OrganizationModuleAccess.create(data);
      }

      // Fire-and-forget audit log — don't block the mutation
      base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: selectedOrg,
        location_id: '',
        patient_id: '',
        module: 'MODULE_TOGGLE',
        action: enabled ? 'enable' : 'disable',
        record_type: 'OrganizationModuleAccess',
        record_id: result.id,
        metadata: { module_code }
      }).catch(() => {});
      return result;
    },
    onMutate: async ({ module_code, enabled }) => {
      // Optimistic update: immediately reflect the change in the UI
      await queryClient.cancelQueries({ queryKey: ['orgModuleAccess', selectedOrg] });
      const previous = queryClient.getQueryData(['orgModuleAccess', selectedOrg]);
      queryClient.setQueryData(['orgModuleAccess', selectedOrg], (old = []) => {
        const existing = old.find(a => a.module_code === module_code);
        if (existing) {
          return old.map(a => a.module_code === module_code ? { ...a, is_enabled: enabled } : a);
        }
        return [...old, { module_code, organization_id: selectedOrg, is_enabled: enabled, id: `optimistic-${module_code}` }];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['orgModuleAccess', selectedOrg], context.previous);
      }
      toast.error('Failed to update module');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgModuleAccess', selectedOrg] });
      toast.success('Module updated');
    },
  });

  const getModuleStatus = (module_code) => {
    const global = globalAvailability.find(g => g.module_code === module_code);
    const orgAccess = orgModuleAccess.find(a => a.module_code === module_code);
    const permission = togglePermissions.find(p => p.module_code === module_code);

    return {
      globalEnabled: global?.is_globally_enabled !== false,
      orgEnabled: orgAccess?.is_enabled || false,
      canOrgToggle: permission?.org_can_toggle || false
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Module Toggles</h1>
        <p className="text-slate-500 mt-1">Enable/disable modules globally and per organization</p>
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Module Toggle Rules</p>
              <ul className="text-sm text-amber-800 mt-1 space-y-1">
                <li>• PLATFORM_OWNER can enable/disable modules globally and per organization</li>
                <li>• ORG_SUPER_USER can toggle modules only when explicitly allowed by owner</li>
                <li>• Disabling a module globally hides it for all organizations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {isPlatformOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Global Module Availability</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(MODULE_GROUPS).map(([group, moduleCodes]) => (
              <div key={group} className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">{group}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {moduleCodes.map(code => {
                    const module = modules.find(m => m.module_code === code) || { module_code: code, module_name: code };
                    const status = getModuleStatus(code);
                    return (
                      <div key={code} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                        <span className="text-sm font-medium">{module.module_name}</span>
                        <Switch
                          checked={status.globalEnabled}
                          onCheckedChange={(checked) => toggleGlobalMutation.mutate({ module_code: code, enabled: checked })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization-Level Modules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.organization_name || org.name || `Org-${org.id.substring(0, 8)}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedOrg && (
            <div>
              {Object.entries(MODULE_GROUPS).map(([group, moduleCodes]) => (
                <div key={group} className="mb-6">
                  <h3 className="font-semibold text-slate-900 mb-3">{group}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {moduleCodes.map(code => {
                      const module = modules.find(m => m.module_code === code) || { module_code: code, module_name: code };
                      const status = getModuleStatus(code);
                      const canToggle = isPlatformOwner || (isOrgSuperUser && status.canOrgToggle);

                      return (
                        <div key={code} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                          <div>
                            <span className="text-sm font-medium">{module.module_name}</span>
                            {!status.globalEnabled && (
                              <Badge variant="secondary" className="ml-2 text-xs">Global OFF</Badge>
                            )}
                          </div>
                          <Switch
                            checked={status.orgEnabled}
                            onCheckedChange={(checked) => toggleOrgMutation.mutate({ module_code: code, enabled: checked })}
                            disabled={!status.globalEnabled || !canToggle}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}