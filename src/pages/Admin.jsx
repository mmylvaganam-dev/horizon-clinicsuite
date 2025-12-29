import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Users, 
  Shield, 
  Grid3X3, 
  Settings,
  FileText,
  Key,
  Activity
} from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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
    return role?.role_name === 'PLATFORM_OWNER';
  });

  const isAppAdmin = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'APP_ADMIN';
  });

  const adminModules = [
    {
      title: 'Organizations',
      description: 'Manage tenant organizations',
      icon: Building2,
      page: 'AdminOrganizations',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Locations',
      description: 'Manage sites and branches',
      icon: MapPin,
      page: 'AdminLocations',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Departments',
      description: 'Manage departments',
      icon: Grid3X3,
      page: 'AdminDepartments',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Organization Users',
      description: 'Manage organization users',
      icon: Users,
      page: 'OrganizationUserManagement',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      title: 'Users & Roles',
      description: 'Manage user roles and permissions',
      icon: Users,
      page: 'AdminUsers',
      color: 'from-teal-500 to-teal-600'
    },
    {
      title: 'Role Standards',
      description: 'Standardized RBAC roles',
      icon: Shield,
      page: 'AdminRoleStandards',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Role Permissions',
      description: 'View role permission matrix',
      icon: Shield,
      page: 'AdminRolePermissions',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Permissions',
      description: 'Configure role permissions',
      icon: Shield,
      page: 'AdminPermissions',
      color: 'from-rose-500 to-rose-600'
    },
    {
      title: 'Permission Matrix',
      description: 'Visual permission editor',
      icon: Grid3X3,
      page: 'AdminPermissionMatrix',
      color: 'from-violet-500 to-violet-600'
    },
    {
      title: 'Modules',
      description: 'Manage module access',
      icon: Grid3X3,
      page: 'AdminModules',
      color: 'from-amber-500 to-amber-600'
    },
    {
      title: 'Audit Logs',
      description: 'View system audit logs',
      icon: FileText,
      page: 'AdminAuditLogs',
      color: 'from-slate-500 to-slate-600'
    },
    {
      title: 'Break-Glass Report',
      description: 'Emergency access audit',
      icon: Shield,
      page: 'AdminBreakGlassReport',
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'Configuration',
      description: 'Organization settings',
      icon: Settings,
      page: 'AdminConfig',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Organization Branding',
      description: 'White-label branding',
      icon: Settings,
      page: 'AdminOrganizationBranding',
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'System Health',
      description: 'Data integrity monitoring',
      icon: Activity,
      page: 'AdminSystemHealth',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Service Catalog',
      description: 'Manage services and pricing',
      icon: Grid3X3,
      page: 'AdminServiceCatalog',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      title: 'Tax Rules',
      description: 'Configure tax rates',
      icon: Settings,
      page: 'AdminTaxRules',
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Numbering Rules',
      description: 'Document numbering formats',
      icon: Key,
      page: 'AdminNumberingRules',
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Chart of Accounts',
      description: 'Accounting accounts',
      icon: Grid3X3,
      page: 'AdminChartOfAccounts',
      color: 'from-violet-500 to-violet-600'
    },
    {
      title: 'Posting Rules',
      description: 'Accounting automation',
      icon: Settings,
      page: 'AdminPostingRules',
      color: 'from-fuchsia-500 to-fuchsia-600'
    },
    {
      title: 'Patient Portal',
      description: 'Portal account management',
      icon: Users,
      page: 'AdminPatientPortal',
      color: 'from-sky-500 to-sky-600'
    },
    {
      title: 'Government Reporting',
      description: 'Regulatory reports',
      icon: FileText,
      page: 'GovernmentReporting',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Partner Management',
      description: 'Referral partners',
      icon: Users,
      page: 'PartnerManagement',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Data Export',
      description: 'Export bundles',
      icon: FileText,
      page: 'DataExport',
      color: 'from-teal-500 to-teal-600'
    },
    {
      title: 'Export Approvals',
      description: 'Review export requests',
      icon: Shield,
      page: 'AdminExportApprovals',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Retention Policies',
      description: 'Data retention rules',
      icon: Activity,
      page: 'AdminRetentionPolicies',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Archive Management',
      description: 'Archived records',
      icon: FileText,
      page: 'AdminArchive',
      color: 'from-slate-500 to-slate-600'
    },
    {
      title: 'Backup Status',
      description: 'Backup operations',
      icon: Activity,
      page: 'AdminBackups',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Compliance Checklist',
      description: 'Deployment validation',
      icon: Shield,
      page: 'AdminComplianceChecklist',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Security Posture',
      description: 'Access controls & monitoring',
      icon: Shield,
      page: 'AdminSecurityPosture',
      color: 'from-purple-500 to-purple-600'
      },
      {
      title: 'System Version',
      description: 'Version control & schema lock',
      icon: Shield,
      page: 'AdminSystemVersion',
      color: 'from-teal-500 to-teal-600'
      },
      {
        title: 'Go-Live Checklist',
        description: 'Production readiness validation',
        icon: Shield,
        page: 'AdminGoLiveChecklist',
        color: 'from-emerald-500 to-emerald-600'
        },
        {
        title: 'Security Validation',
        description: 'Verify security controls',
        icon: Shield,
        page: 'AdminSecurityValidation',
        color: 'from-red-500 to-red-600'
        }
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Administration</h1>
        <p className="text-slate-500 mt-1">Manage organizations, users, roles, and system configuration</p>
      </div>

      {isPlatformOwner && (
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-rose-300 bg-rose-50"
          onClick={() => navigate(createPageUrl('PlatformSettings'))}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-rose-900">Platform Settings</h3>
                <p className="text-sm text-rose-700">Owner-level system administration</p>
                <Badge className="bg-rose-200 text-rose-800 mt-2">PLATFORM_OWNER ONLY</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isAppAdmin && (
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-blue-300 bg-blue-50"
          onClick={() => navigate(createPageUrl('AppAdministration'))}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">App Administration</h3>
                <p className="text-sm text-blue-700">Limited configuration support (no PHI access)</p>
                <Badge className="bg-blue-200 text-blue-800 mt-2">APP_ADMIN</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminModules.map((module) => (
          <Link key={module.page} to={createPageUrl(module.page)}>
            <Card className="hover:shadow-lg transition-all duration-300 group cursor-pointer border-0 overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${module.color}`} />
              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{module.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}