import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRoleStandards() {
  const queryClient = useQueryClient();
  const [initializing, setInitializing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const standardRoles = [
    {
      role_name: 'PLATFORM_OWNER',
      description: 'Super Admin - Platform owner only',
      level: 'platform',
      restrictions: 'Full access to all platform settings'
    },
    {
      role_name: 'APP_ADMIN',
      description: 'Internal admin for configuration support',
      level: 'platform',
      restrictions: 'No PHI access expansion'
    },
    {
      role_name: 'ORG_SUPER_USER',
      description: 'Organization administrator',
      level: 'organization',
      restrictions: 'Cannot disable AuditLog, cannot change DeploymentProfile, cannot bypass organization scoping'
    },
    {
      role_name: 'CLINIC_ADMIN_STAFF',
      description: 'Clinic administrative staff',
      level: 'organization',
      restrictions: 'Organization-scoped administrative access'
    },
    {
      role_name: 'PHYSICIAN',
      description: 'Medical doctor with clinical access',
      level: 'organization',
      restrictions: 'Clinical data access within organization'
    },
    {
      role_name: 'LAB_TECH',
      description: 'Laboratory technician',
      level: 'organization',
      restrictions: 'Lab module access only'
    },
    {
      role_name: 'PHARMACIST',
      description: 'Pharmacy staff',
      level: 'organization',
      restrictions: 'Pharmacy module access only'
    },
    {
      role_name: 'DIAGNOSTICS_TECH',
      description: 'Diagnostics technician (Cardio/PFT/Radiology)',
      level: 'organization',
      restrictions: 'Diagnostics module access only'
    },
    {
      role_name: 'FINANCE_USER',
      description: 'Finance and accounting staff',
      level: 'organization',
      restrictions: 'Finance module access only'
    },
    {
      role_name: 'DIRECTOR_REPORT_VIEWER',
      description: 'Executive report viewer',
      level: 'organization',
      restrictions: 'Read-only access to management reports'
    },
    {
      role_name: 'READONLY_AUDITOR',
      description: 'Read-only auditor for compliance review',
      level: 'organization',
      restrictions: 'Read-only access to audit logs and reports'
    }
  ];

  const createRoleMutation = useMutation({
    mutationFn: async (roleData) => {
      const role = await base44.entities.Role.create(roleData);

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'RBAC',
        action: 'create_role',
        record_type: 'Role',
        record_id: role.id,
        metadata: {
          role_name: roleData.role_name,
          description: roleData.description,
          level: roleData.level
        }
      });

      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
    },
  });

  const initializeStandardRoles = async () => {
    setInitializing(true);
    let created = 0;

    for (const standardRole of standardRoles) {
      const exists = roles.find(r => r.role_name === standardRole.role_name);
      if (!exists) {
        try {
          await createRoleMutation.mutateAsync(standardRole);
          created++;
        } catch (error) {
          console.error(`Failed to create ${standardRole.role_name}:`, error);
        }
      }
    }

    setInitializing(false);
    if (created > 0) {
      toast.success(`${created} standard role(s) created`);
    } else {
      toast.success('All standard roles already exist');
    }
  };

  const getRoleStatus = (roleName) => {
    return roles.find(r => r.role_name === roleName || r.code === roleName);
  };

  const seedFunctionalRoles = async () => {
    setSeeding(true);
    try {
      const response = await base44.functions.invoke('seedFunctionalRoles', {});
      toast.success(response.data.message);
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
    } catch (error) {
      toast.error('Failed to seed roles: ' + error.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Role Standards</h1>
        <p className="text-slate-500 mt-1">Standardized RBAC role definitions</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900">Organization Scoping</p>
              <p className="text-sm text-blue-700 mt-1">
                All organization-level roles (except PLATFORM_OWNER and APP_ADMIN) are scoped to their organization.
                ORG_SUPER_USER cannot disable AuditLog, change DeploymentProfile, or bypass organization scoping.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Standard Roles</CardTitle>
          <div className="flex gap-2">
            <Button onClick={initializeStandardRoles} disabled={initializing} variant="outline">
              {initializing ? 'Initializing...' : 'Initialize Missing Roles'}
            </Button>
            <Button onClick={seedFunctionalRoles} disabled={seeding}>
              {seeding ? 'Seeding...' : 'Seed Functional Roles'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Platform Roles */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Platform Roles</h3>
              <div className="space-y-2">
                {standardRoles.filter(r => r.level === 'platform').map((role) => {
                  const exists = getRoleStatus(role.role_name);
                  return (
                    <div key={role.role_name} className="p-4 rounded-lg border bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900">{role.role_name}</p>
                            {exists ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{role.description}</p>
                          <p className="text-xs text-amber-700 mt-1">🔒 {role.restrictions}</p>
                        </div>
                        <Badge className={exists ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                          {exists ? 'Active' : 'Missing'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Organization Roles */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Organization Roles</h3>
              <div className="space-y-2">
                {standardRoles.filter(r => r.level === 'organization').map((role) => {
                  const exists = getRoleStatus(role.role_name);
                  return (
                    <div key={role.role_name} className="p-4 rounded-lg border bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900">{role.role_name}</p>
                            {exists ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{role.description}</p>
                          <p className="text-xs text-blue-700 mt-1">🔐 {role.restrictions}</p>
                        </div>
                        <Badge className={exists ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                          {exists ? 'Active' : 'Missing'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Security Rules</p>
              <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                <li>ORG_SUPER_USER manages users within their organization only</li>
                <li>ORG_SUPER_USER cannot disable AuditLog</li>
                <li>ORG_SUPER_USER cannot change DeploymentProfile</li>
                <li>ORG_SUPER_USER cannot bypass organization scoping</li>
                <li>All role creation and changes are audited</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}