import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Grid3X3, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';

const moduleCategoryColors = {
  clinical: 'from-teal-500 to-teal-600',
  administrative: 'from-blue-500 to-blue-600',
  financial: 'from-amber-500 to-amber-600',
  operational: 'from-purple-500 to-purple-600',
  integration: 'from-slate-500 to-slate-600',
};

export default function AdminModules() {
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState(null);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list(),
  });

  const { data: orgModuleAccess = [] } = useQuery({
    queryKey: ['orgModuleAccess'],
    queryFn: () => base44.entities.OrganizationModuleAccess.list(),
  });

  const toggleModuleMutation = useMutation({
    mutationFn: ({ orgId, modId, enabled }) => {
      const existing = orgModuleAccess.find(oma => oma.organization_id === orgId && oma.module_id === modId);
      if (existing) {
        return base44.entities.OrganizationModuleAccess.update(existing.id, { enabled });
      } else {
        return base44.entities.OrganizationModuleAccess.create({
          organization_id: orgId,
          module_id: modId,
          enabled,
          enabled_date: new Date().toISOString().split('T')[0],
          license_type: 'full'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgModuleAccess'] });
    },
  });

  const hasModuleAccess = (orgId, modId) => {
    const access = orgModuleAccess.find(oma => oma.organization_id === orgId && oma.module_id === modId);
    return access ? access.enabled : false;
  };

  const toggleModule = (orgId, modId) => {
    const current = hasModuleAccess(orgId, modId);
    toggleModuleMutation.mutate({ orgId, modId, enabled: !current });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Module Access</h1>
          <p className="text-slate-500 mt-1">Manage module enablement per organization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 p-4 bg-white border-0 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Organizations</h3>
          <div className="space-y-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedOrg?.id === org.id
                    ? 'bg-amber-100 text-amber-900'
                    : 'hover:bg-slate-100'
                }`}
              >
                <p className="font-medium text-sm">{org.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{org.code}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3">
          {!selectedOrg ? (
            <Card className="p-12 text-center bg-white border-0 shadow-sm">
              <Grid3X3 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Select an organization</h3>
              <p className="text-slate-500 mt-1">Choose an organization to manage module access</p>
            </Card>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((module) => {
                const isEnabled = hasModuleAccess(selectedOrg.id, module.id);
                return (
                  <Card key={module.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${moduleCategoryColors[module.category]} flex items-center justify-center`}>
                        <Grid3X3 className="w-6 h-6 text-white" />
                      </div>
                      <button
                        onClick={() => toggleModule(selectedOrg.id, module.id)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          isEnabled ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}
                        disabled={module.is_core}
                      >
                        {isEnabled ? (
                          <Check className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <X className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{module.name}</h3>
                    <p className="text-sm text-slate-500 mb-2">{module.code}</p>
                    {module.description && (
                      <p className="text-xs text-slate-400 mb-3">{module.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">{module.category}</Badge>
                      {module.is_core && <Badge variant="outline" className="text-xs bg-blue-50">Core</Badge>}
                      <Badge variant="outline" className="text-xs">v{module.version}</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}