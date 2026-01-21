import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  MapPin, 
  Users, 
  Shield, 
  Grid3X3, 
  Settings,
  FileText,
  Key,
  Activity,
  DollarSign,
  UserCheck,
  Lock,
  Check,
  X,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
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

  const { data: selectedUserRoles = [] } = useQuery({
    queryKey: ['selectedUserRoles', selectedUser?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: selectedUser.id });
      return roles;
    },
    enabled: !!selectedUser,
  });

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'PLATFORM_OWNER';
  });

  const isAppAdmin = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'APP_ADMIN';
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, hasRole }) => {
      if (hasRole) {
        const userRole = selectedUserRoles.find(ur => ur.role_id === roleId);
        if (userRole) {
          await base44.entities.UserRole.delete(userRole.id);
        }
      } else {
        await base44.entities.UserRole.create({
          user_id: userId,
          role_id: roleId,
          organization_id: user.organization_id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['selectedUserRoles']);
      toast.success('Role updated successfully');
    },
    onError: () => {
      toast.error('Failed to update role');
    }
  });

  const handleToggleRole = (roleId, hasRole) => {
    if (!selectedUser) return;
    toggleRoleMutation.mutate({ userId: selectedUser.id, roleId, hasRole });
  };

  const adminCategories = [
    {
      category: 'Organization Setup',
      description: 'Companies, locations, and structure',
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      modules: [
        { title: 'Companies & Organizations', description: 'Manage organizations and locations', icon: Building2, page: 'AdminCompanies', ownerOnly: true },
        { title: 'Module Toggles', description: 'Enable/disable modules', icon: Grid3X3, page: 'AdminModuleToggles' },
        { title: 'Configuration', description: 'Organization settings', icon: Settings, page: 'AdminConfig' },
        { title: 'Organization Branding', description: 'White-label branding', icon: Settings, page: 'AdminOrganizationBranding' },
      ]
    },
    {
      category: 'Users & Access Control',
      description: 'User management and permissions',
      icon: Users,
      color: 'from-teal-500 to-teal-600',
      modules: [
        { title: 'Organization Users', description: 'Manage organization users', icon: Users, page: 'OrganizationUserManagement' },
        { title: 'Users & Roles', description: 'Manage user roles and permissions', icon: Users, page: 'AdminUsers' },
        { title: 'Role Standards', description: 'Standardized RBAC roles', icon: Shield, page: 'AdminRoleStandards' },
        { title: 'Role Permissions', description: 'View role permission matrix', icon: Shield, page: 'AdminRolePermissions' },
        { title: 'Permissions', description: 'Configure role permissions', icon: Shield, page: 'AdminPermissions' },
        { title: 'Permission Matrix', description: 'Visual permission editor', icon: Grid3X3, page: 'AdminPermissionMatrix' },
        { title: 'Modules', description: 'Manage module access', icon: Grid3X3, page: 'AdminModules' },
      ]
    },
    {
      category: 'Financial Configuration',
      description: 'Billing, accounting, and pricing',
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      modules: [
        { title: 'Billing', description: 'Invoice and payment management', icon: DollarSign, page: 'Billing' },
        { title: 'Service Catalog', description: 'Manage services and pricing', icon: Grid3X3, page: 'AdminServiceCatalog' },
        { title: 'Tax Rules', description: 'Configure tax rates', icon: Settings, page: 'AdminTaxRules' },
        { title: 'Numbering Rules', description: 'Document numbering formats', icon: Key, page: 'AdminNumberingRules' },
        { title: 'Chart of Accounts', description: 'Accounting accounts', icon: Grid3X3, page: 'AdminChartOfAccounts' },
        { title: 'Posting Rules', description: 'Accounting automation', icon: Settings, page: 'AdminPostingRules' },
      ]
    },
    {
      category: 'Security & Compliance',
      description: 'Audit, monitoring, and validation',
      icon: Shield,
      color: 'from-indigo-500 to-indigo-600',
      modules: [
        { title: 'Audit Logs', description: 'View system audit logs', icon: FileText, page: 'AdminAuditLogs' },
        { title: 'Break-Glass Report', description: 'Emergency access audit', icon: Shield, page: 'AdminBreakGlassReport' },
        { title: 'Security Posture', description: 'Access controls & monitoring', icon: Shield, page: 'AdminSecurityPosture' },
        { title: 'Security Validation', description: 'Verify security controls', icon: Shield, page: 'AdminSecurityValidation' },
        { title: 'Compliance Checklist', description: 'Deployment validation', icon: Shield, page: 'AdminComplianceChecklist' },
        { title: 'Go-Live Checklist', description: 'Production readiness validation', icon: Shield, page: 'AdminGoLiveChecklist' },
      ]
    },
    {
      category: 'System Operations',
      description: 'Monitoring, backups, and maintenance',
      icon: Activity,
      color: 'from-emerald-500 to-emerald-600',
      modules: [
        { title: 'System Health', description: 'Data integrity monitoring', icon: Activity, page: 'AdminSystemHealth' },
        { title: 'Organization Activity', description: 'Aggregate activity metrics', icon: Activity, page: 'AdminOrganizationActivity' },
        { title: 'System Version', description: 'Version control & schema lock', icon: Shield, page: 'AdminSystemVersion' },
        { title: 'Backup Status', description: 'Backup operations', icon: Activity, page: 'AdminBackups' },
      ]
    },
    {
      category: 'Data Management',
      description: 'Export, retention, and archival',
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      modules: [
        { title: 'Data Export', description: 'Export bundles', icon: FileText, page: 'DataExport' },
        { title: 'Export Approvals', description: 'Review export requests', icon: Shield, page: 'AdminExportApprovals' },
        { title: 'Retention Policies', description: 'Data retention rules', icon: Activity, page: 'AdminRetentionPolicies' },
        { title: 'Archive Management', description: 'Archived records', icon: FileText, page: 'AdminArchive' },
      ]
    },
    {
      category: 'External Integration',
      description: 'Partners, portals, and reporting',
      icon: Users,
      color: 'from-cyan-500 to-cyan-600',
      modules: [
        { title: 'Patient Portal', description: 'Portal account management', icon: Users, page: 'AdminPatientPortal' },
        { title: 'Government Reporting', description: 'Regulatory reports', icon: FileText, page: 'GovernmentReporting' },
        { title: 'Partner Management', description: 'Referral partners', icon: Users, page: 'PartnerManagement' },
      ]
    },
  ];

  const adminModules = [
    {
      title: 'Companies & Organizations',
      description: 'Manage organizations and locations',
      icon: Building2,
      page: 'AdminCompanies',
      color: 'from-blue-500 to-blue-600',
      ownerOnly: true
    },
    {
      title: 'Module Toggles',
      description: 'Enable/disable modules',
      icon: Grid3X3,
      page: 'AdminModuleToggles',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Billing',
      description: 'Invoice and payment management',
      icon: DollarSign,
      page: 'Billing',
      color: 'from-green-500 to-green-600'
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
      title: 'Organization Activity',
      description: 'Aggregate activity metrics',
      icon: Activity,
      page: 'AdminOrganizationActivity',
      color: 'from-blue-500 to-blue-600'
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

  const functionalRoles = [
    { name: 'FRONT_DESK_STAFF', label: 'Front Desk Staff', icon: UserCheck, description: 'Patient registration, appointments', color: 'bg-blue-500' },
    { name: 'PHYSICIAN', label: 'Physician', icon: Activity, description: 'Clinical documentation, prescriptions', color: 'bg-purple-500' },
    { name: 'NURSE', label: 'Nurse', icon: Users, description: 'Vitals, medication administration', color: 'bg-pink-500' },
    { name: 'LAB_TECH', label: 'Lab Technician', icon: FileText, description: 'Lab specimen processing, results', color: 'bg-cyan-500' },
    { name: 'PHARMACIST', label: 'Pharmacist', icon: Shield, description: 'Dispense medications, inventory', color: 'bg-green-500' },
    { name: 'RADIOLOGIST', label: 'Radiologist', icon: Activity, description: 'Imaging orders and interpretation', color: 'bg-orange-500' },
    { name: 'BILLING_STAFF', label: 'Billing Staff', icon: DollarSign, description: 'Invoicing and payment processing', color: 'bg-emerald-500' },
    { name: 'CLINIC_ADMIN_STAFF', label: 'Clinic Admin', icon: Settings, description: 'System configuration, user management', color: 'bg-indigo-500' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Administration</h1>
          <p className="text-slate-500 mt-1">Manage users, permissions, and system configuration</p>
        </div>
        <PageInfoTooltip
          title="System Administration"
          description="Central hub for managing all system configuration, security, users, roles, billing, compliance, and operational settings."
          useCases={[
            "Assign roles to organization members",
            "Configure user permissions",
            "Set up organizations and locations",
            "Monitor system health and security"
          ]}
          bestPractices={[
            "Assign roles based on job function",
            "Review permissions regularly",
            "Monitor audit logs",
            "Restrict admin access appropriately"
          ]}
        />
      </div>

      <Tabs defaultValue="access" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="access" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            User Access Control
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organization Setup
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System Settings
          </TabsTrigger>
        </TabsList>

        {/* User Access Control Tab */}
        <TabsContent value="access" className="space-y-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <UserCheck className="w-6 h-6" />
                User Roles & Permissions
              </CardTitle>
              <p className="text-sm text-blue-700">Assign functional roles to organization members with ON/OFF toggles</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Selection */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left transform hover:scale-105 ${
                      selectedUser?.id === u.id
                        ? 'border-blue-500 bg-blue-100 shadow-lg'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedUser?.id === u.id ? 'bg-blue-500' : 'bg-slate-200'
                      }`}>
                        <Users className={`w-5 h-5 ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div>
                        <p className={`font-semibold ${selectedUser?.id === u.id ? 'text-blue-900' : 'text-slate-900'}`}>
                          {u.full_name}
                        </p>
                        <p className="text-xs text-slate-600">{u.email}</p>
                      </div>
                    </div>
                    {selectedUser?.id === u.id && (
                      <Badge className="mt-2 bg-blue-600">Selected</Badge>
                    )}
                  </button>
                ))}
              </div>

              {/* Role Toggles */}
              {selectedUser && (
                <div className="mt-6 p-6 rounded-xl bg-white border-2 border-blue-300 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Assign Roles to {selectedUser.full_name}
                      </h3>
                      <p className="text-sm text-slate-600">Toggle ON/OFF to grant or revoke access</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {functionalRoles.map((role) => {
                      const roleData = allRoles.find(r => r.role_name === role.name);
                      if (!roleData) return null;
                      
                      const hasRole = selectedUserRoles.some(ur => ur.role_id === roleData.id);
                      
                      return (
                        <div
                          key={role.name}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            hasRole
                              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-12 h-12 rounded-xl ${role.color} flex items-center justify-center shadow-lg transform transition-transform ${hasRole ? 'scale-110' : ''}`}>
                                <role.icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-slate-900">{role.label}</p>
                                <p className="text-xs text-slate-600 mt-1">{role.description}</p>
                                {hasRole && (
                                  <Badge className="mt-2 bg-emerald-600 flex items-center gap-1 w-fit">
                                    <Check className="w-3 h-3" />
                                    Active
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={hasRole}
                              onCheckedChange={() => handleToggleRole(roleData.id, hasRole)}
                              className={hasRole ? 'bg-emerald-600' : ''}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!selectedUser && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <UserCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 font-medium">Select a user to manage their roles</p>
                  <p className="text-sm text-slate-500 mt-1">Click on a user card above to get started</p>
                </div>
              )}

              {/* Permission Summary Chart */}
              <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">Roles & Permissions Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {functionalRoles.map((role) => (
                      <div key={role.name} className="p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg ${role.color} flex items-center justify-center`}>
                            <role.icon className="w-4 h-4 text-white" />
                          </div>
                          <p className="font-semibold text-sm">{role.label}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            {role.description.split(',')[0]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Setup Tab */}
        <TabsContent value="organization" className="space-y-6">

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

      {isPlatformOwner && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Company & Organization Setup
            </h3>
            <p className="text-sm text-slate-500 mb-4">Manage companies, organizations, and users</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <button
                onClick={() => navigate(createPageUrl('FinanceCompanies'))}
                className="p-4 rounded-lg border-2 border-blue-300 bg-white hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Company Profile</p>
                    <p className="text-xs text-slate-500">Business details</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate(createPageUrl('AdminCompanies'))}
                className="p-4 rounded-lg border-2 border-blue-300 bg-white hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Organizations</p>
                    <p className="text-xs text-slate-500">Create & manage</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate(createPageUrl('CompanyHierarchy'))}
                className="p-4 rounded-lg border-2 border-cyan-300 bg-white hover:bg-cyan-50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Hierarchy</p>
                    <p className="text-xs text-slate-500">Company structure</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate(createPageUrl('OrganizationUserManagement'))}
                className="p-4 rounded-lg border-2 border-teal-300 bg-white hover:bg-teal-50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Users</p>
                    <p className="text-xs text-slate-500">Invite & manage</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate(createPageUrl('AdminRoleStandards'))}
                className="p-4 rounded-lg border-2 border-indigo-300 bg-white hover:bg-indigo-50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Roles</p>
                    <p className="text-xs text-slate-500">Setup & assign</p>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {adminCategories.map((category, idx) => (
          <div key={idx}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                <category.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{category.category}</h2>
                <p className="text-sm text-slate-500">{category.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {category.modules.map((module) => {
                if (module.ownerOnly && !isPlatformOwner) return null;

                return (
                  <Link key={module.page} to={createPageUrl(module.page)}>
                    <Card className="hover:shadow-lg transition-all duration-200 group cursor-pointer border overflow-hidden h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <module.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm leading-tight">
                              {module.title}
                              {module.ownerOnly && <Badge className="ml-1 bg-rose-100 text-rose-700 text-[10px] px-1">Owner</Badge>}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-slate-500">{module.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}