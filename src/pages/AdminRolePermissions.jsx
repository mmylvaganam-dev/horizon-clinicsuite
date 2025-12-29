import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { MODULE_PERMISSIONS } from '../components/rbac/ModulePermissions';

export default function AdminRolePermissions() {
  const roles = Object.keys(MODULE_PERMISSIONS);

  const getPermissionValue = (permissions, module, action) => {
    if (permissions.all) return true;
    return permissions[module]?.[action] || false;
  };

  const formatModuleName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Role Permissions Matrix</h1>
        <p className="text-slate-500 mt-1">Default module permissions by role</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Permission Enforcement</p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1 list-disc list-inside">
                <li>All exports require permission and reason (logged to AuditLog)</li>
                <li>All print actions are audited</li>
                <li>Patient data access is role-based and logged</li>
                <li>PLATFORM_OWNER and ORG_SUPER_USER have all permissions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {roles.map((roleName) => {
          const permissions = MODULE_PERMISSIONS[roleName];
          
          return (
            <Card key={roleName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600" />
                  {roleName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {permissions.all ? (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-emerald-900 font-semibold">✓ Full System Access</p>
                    <p className="text-sm text-emerald-700 mt-1">This role has access to all modules and features</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(permissions).map(([module, actions]) => (
                      <div key={module} className="border rounded-lg p-4 bg-slate-50">
                        <p className="font-semibold text-slate-900 mb-2 capitalize">{formatModuleName(module)}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(actions).map(([action, allowed]) => (
                            <div key={action} className="flex items-center gap-2">
                              {allowed ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              )}
                              <span className={`text-sm ${allowed ? 'text-slate-900' : 'text-slate-500'}`}>
                                {formatModuleName(action)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}