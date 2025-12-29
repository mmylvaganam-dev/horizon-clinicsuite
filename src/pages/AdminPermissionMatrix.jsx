import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, AlertTriangle, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

const actions = [
  'view',
  'create',
  'update',
  'delete',
  'export',
  'print',
  'sign',
  'release',
  'refund_void',
  'admin_config'
];

const highRiskActions = ['export', 'print', 'sign', 'release', 'refund_void', 'admin_config'];

const actionColors = {
  view: 'bg-blue-50 text-blue-700',
  create: 'bg-green-50 text-green-700',
  update: 'bg-amber-50 text-amber-700',
  delete: 'bg-rose-50 text-rose-700',
  export: 'bg-purple-50 text-purple-700 border-purple-300',
  print: 'bg-purple-50 text-purple-700 border-purple-300',
  sign: 'bg-red-50 text-red-700 border-red-300',
  release: 'bg-red-50 text-red-700 border-red-300',
  refund_void: 'bg-orange-50 text-orange-700 border-orange-300',
  admin_config: 'bg-slate-50 text-slate-700 border-slate-300'
};

export default function AdminPermissionMatrix() {
  const queryClient = useQueryClient();
  const [hoveredCell, setHoveredCell] = useState(null);

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list(),
  });

  const { data: rolePermissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list(),
  });

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, moduleCode, action, currentValue }) => {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      const existing = rolePermissions.find(
        rp => rp.role_id === roleId && rp.module_code === moduleCode && rp.action === action
      );

      let result;
      if (existing) {
        result = await base44.entities.RolePermission.update(existing.id, {
          is_allowed: !currentValue
        });
      } else {
        result = await base44.entities.RolePermission.create({
          role_id: roleId,
          module_code: moduleCode,
          action,
          is_allowed: true
        });
      }

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'update_permission',
        record_type: 'RolePermission',
        record_id: result.id,
        metadata: {
          role_id: roleId,
          module_code: moduleCode,
          permission_action: action,
          is_allowed: !currentValue,
          high_risk: highRiskActions.includes(action)
        }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      toast.success('Permission updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update permission');
    }
  });

  const hasPermission = (roleId, moduleCode, action) => {
    const permission = rolePermissions.find(
      rp => rp.role_id === roleId && rp.module_code === moduleCode && rp.action === action
    );
    return permission?.is_allowed || false;
  };

  const handleToggle = (roleId, moduleCode, action) => {
    const currentValue = hasPermission(roleId, moduleCode, action);
    const isHighRisk = highRiskActions.includes(action);
    
    if (!currentValue && isHighRisk) {
      if (!confirm(`⚠️ WARNING: You are granting HIGH-RISK permission "${action}" for module "${moduleCode}". Are you sure?`)) {
        return;
      }
    }

    togglePermissionMutation.mutate({ roleId, moduleCode, action, currentValue });
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || roleId;
  };

  const getModuleName = (moduleCode) => {
    const module = modules.find(m => m.code === moduleCode);
    return module?.name || moduleCode;
  };

  const isLoading = loadingRoles || loadingModules || loadingPermissions;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Permission Matrix</h1>
          <p className="text-slate-500 mt-1">Manage role permissions across modules</p>
        </div>
      </div>

      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">High-Risk Permissions</p>
            <p className="text-xs text-amber-700 mt-1">
              Actions marked with ⚠️ are high-risk: export, print, sign, release, refund_void, admin_config
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 p-3 text-left font-semibold text-slate-900">
                    Role
                  </th>
                  {modules.map((module) => (
                    <th key={module.id} className="border-b border-slate-200 p-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Shield className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-900">{module.name}</span>
                        <Badge variant="outline" className="text-xs">{module.code}</Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <React.Fragment key={role.id}>
                    <tr className="border-b border-slate-200">
                      <td 
                        className="sticky left-0 z-10 bg-white border-r border-slate-200 p-3 font-semibold text-slate-900"
                        rowSpan={actions.length}
                      >
                        {role.name}
                        {role.is_system && (
                          <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700">
                            System
                          </Badge>
                        )}
                      </td>
                    </tr>
                    {actions.map((action, actionIdx) => (
                      <tr 
                        key={`${role.id}-${action}`}
                        className={actionIdx < actions.length - 1 ? '' : 'border-b-2 border-slate-300'}
                      >
                        {modules.map((module) => {
                          const hasAccess = hasPermission(role.id, module.code, action);
                          const isHighRisk = highRiskActions.includes(action);
                          const cellKey = `${role.id}-${module.code}-${action}`;
                          const isHovered = hoveredCell === cellKey;

                          return (
                            <td 
                              key={module.id}
                              className="border-l border-slate-100 p-1 text-center relative"
                              onMouseEnter={() => setHoveredCell(cellKey)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              <button
                                onClick={() => handleToggle(role.id, module.code, action)}
                                className={`
                                  w-full h-10 rounded-lg transition-all flex items-center justify-center gap-1
                                  ${hasAccess 
                                    ? `${actionColors[action]} border-2` 
                                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                                  }
                                  ${isHovered ? 'ring-2 ring-blue-300' : ''}
                                `}
                                disabled={togglePermissionMutation.isPending}
                              >
                                {hasAccess ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <X className="w-4 h-4 text-slate-300" />
                                )}
                                <span className="text-xs font-medium">{action}</span>
                                {isHighRisk && hasAccess && (
                                  <AlertTriangle className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="p-5 bg-slate-50">
        <h3 className="font-semibold text-slate-900 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {actions.map((action) => (
            <div key={action} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded ${actionColors[action]} border-2 flex items-center justify-center`}>
                <Check className="w-4 h-4" />
              </div>
              <span className="text-sm text-slate-700">{action}</span>
              {highRiskActions.includes(action) && (
                <AlertTriangle className="w-3 h-3 text-amber-600" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}