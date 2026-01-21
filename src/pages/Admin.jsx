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

  // Track user permissions by module (simplified - stored in local state for demo)
  const [userPermissions, setUserPermissions] = useState({});

  const handleTogglePermission = (userId, moduleName, currentAccess) => {
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [moduleName]: !currentAccess
      }
    }));
    toast.success('Access updated successfully');
  };

  const hasModuleAccess = (userId, moduleName) => {
    return userPermissions[userId]?.[moduleName] || false;
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

  const modulePermissions = [
    { 
      category: 'Clinical Operations',
      modules: [
        { name: 'patient_registration', label: 'Patient Registration', icon: Users, description: 'Register and manage patients', color: 'bg-blue-500' },
        { name: 'appointments', label: 'Appointments', icon: Activity, description: 'Schedule and manage appointments', color: 'bg-purple-500' },
        { name: 'emr', label: 'EMR/Clinical Notes', icon: FileText, description: 'Electronic medical records', color: 'bg-teal-500' },
        { name: 'prescriptions', label: 'Prescriptions', icon: FileText, description: 'Write and manage prescriptions', color: 'bg-indigo-500' },
        { name: 'vitals', label: 'Vitals Entry', icon: Activity, description: 'Record patient vitals', color: 'bg-pink-500' }
      ]
    },
    {
      category: 'Pharmacy Operations',
      modules: [
        { name: 'pharmacy_pos', label: 'Pharmacy POS', icon: ShoppingBag, description: 'Point of sale operations', color: 'bg-green-500' },
        { name: 'pharmacy_inventory', label: 'Pharmacy Inventory', icon: Grid3X3, description: 'Stock management', color: 'bg-emerald-500' },
        { name: 'dispense', label: 'Dispense Medications', icon: Check, description: 'Medication dispensing', color: 'bg-teal-500' }
      ]
    },
    {
      category: 'Laboratory',
      modules: [
        { name: 'lab_orders', label: 'Lab Orders', icon: FileText, description: 'Create lab orders', color: 'bg-cyan-500' },
        { name: 'lab_results', label: 'Lab Results Entry', icon: Activity, description: 'Enter test results', color: 'bg-blue-500' },
        { name: 'lab_reports', label: 'Lab Reports', icon: FileText, description: 'View and print reports', color: 'bg-indigo-500' }
      ]
    },
    {
      category: 'Radiology',
      modules: [
        { name: 'radiology_orders', label: 'Radiology Orders', icon: Activity, description: 'Order imaging studies', color: 'bg-orange-500' },
        { name: 'radiology_results', label: 'Radiology Results', icon: FileText, description: 'Enter radiology findings', color: 'bg-red-500' }
      ]
    },
    {
      category: 'Financial',
      modules: [
        { name: 'billing', label: 'Billing & Invoicing', icon: DollarSign, description: 'Create invoices', color: 'bg-green-500' },
        { name: 'payments', label: 'Payment Processing', icon: DollarSign, description: 'Receive payments', color: 'bg-emerald-500' },
        { name: 'reports', label: 'Financial Reports', icon: FileText, description: 'View financial reports', color: 'bg-teal-500' }
      ]
    },
    {
      category: 'Administration',
      modules: [
        { name: 'user_management', label: 'User Management', icon: Users, description: 'Manage system users', color: 'bg-indigo-500' },
        { name: 'system_config', label: 'System Configuration', icon: Settings, description: 'Configure system settings', color: 'bg-purple-500' },
        { name: 'audit_logs', label: 'Audit Logs', icon: FileText, description: 'View system audit logs', color: 'bg-slate-500' }
      ]
    }
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
                Module Access Assignment
              </CardTitle>
              <p className="text-sm text-blue-700">Assign module access to organization members with ON/OFF toggles</p>
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

              {/* Module Access Assignment */}
              {selectedUser && (
                <div className="mt-6 space-y-4">
                  {modulePermissions.map((category, idx) => (
                    <Card key={idx} className="border-2 border-slate-200 bg-white shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50">
                        <CardTitle className="text-lg text-slate-900">{category.category}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {category.modules.map((module) => {
                            const hasAccess = hasModuleAccess(selectedUser.id, module.name);
                            
                            return (
                              <div
                                key={module.name}
                                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                  hasAccess
                                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 shadow-md'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className={`w-12 h-12 rounded-xl ${module.color} flex items-center justify-center shadow-lg transform transition-transform ${hasAccess ? 'scale-110' : ''}`}>
                                      <module.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-bold text-slate-900">{module.label}</p>
                                      <p className="text-xs text-slate-600 mt-1">{module.description}</p>
                                      {hasAccess && (
                                        <Badge className="mt-2 bg-emerald-600 flex items-center gap-1 w-fit">
                                          <Check className="w-3 h-3" />
                                          Access Granted
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleTogglePermission(selectedUser.id, module.name, hasAccess)}
                                    className={`px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 ${
                                      hasAccess
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                  >
                                    {hasAccess ? (
                                      <Check className="w-5 h-5" />
                                    ) : (
                                      <X className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!selectedUser && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <UserCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 font-medium">Select a user to assign module access</p>
                  <p className="text-sm text-slate-500 mt-1">Click on a user card above to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Setup Tab */}
        <TabsContent value="organization" className="space-y-6">

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Building2 className="w-6 h-6" />
                Organization Configuration
              </CardTitle>
              <p className="text-sm text-green-700">Company structure, branding, and location management</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate(createPageUrl('FinanceCompanies'))}
                  className="p-4 rounded-xl border-2 border-blue-300 bg-white hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg mb-3">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-slate-900 text-center">Company Profile</p>
                  <p className="text-xs text-slate-600 text-center mt-1">Business details</p>
                </button>

                <button
                  onClick={() => navigate(createPageUrl('AdminOrganizations'))}
                  className="p-4 rounded-xl border-2 border-cyan-300 bg-white hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg mb-3">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-slate-900 text-center">Organizations</p>
                  <p className="text-xs text-slate-600 text-center mt-1">Locations & structure</p>
                </button>

                <button
                  onClick={() => navigate(createPageUrl('AdminOrganizationBranding'))}
                  className="p-4 rounded-xl border-2 border-purple-300 bg-white hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg mb-3">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-slate-900 text-center">Branding</p>
                  <p className="text-xs text-slate-600 text-center mt-1">Logo & theme</p>
                </button>

                <button
                  onClick={() => navigate(createPageUrl('AdminModuleToggles'))}
                  className="p-4 rounded-xl border-2 border-indigo-300 bg-white hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg mb-3">
                    <Grid3X3 className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-slate-900 text-center">Modules</p>
                  <p className="text-xs text-slate-600 text-center mt-1">Enable/disable</p>
                </button>

                <button
                  onClick={() => navigate(createPageUrl('AdminConfig'))}
                  className="p-4 rounded-xl border-2 border-teal-300 bg-white hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg mb-3">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-slate-900 text-center">Configuration</p>
                  <p className="text-xs text-slate-600 text-center mt-1">System settings</p>
                </button>

                <button
                  onClick={() => navigate(createPageUrl('AdminLocations'))}
                  className="p-4 rounded-xl border-2 border-pink-300 bg-white hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg mb-3">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-slate-900 text-center">Locations</p>
                  <p className="text-xs text-slate-600 text-center mt-1">Clinics & branches</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          {adminCategories.map((category, idx) => (
            <Card key={idx} className={`border-2`}>
              <CardHeader className={`bg-gradient-to-r ${category.color} bg-opacity-10`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900">{category.category}</CardTitle>
                    <p className="text-sm text-slate-600">{category.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {category.modules.map((module) => {
                    if (module.ownerOnly && !isPlatformOwner) return null;

                    return (
                      <button
                        key={module.page}
                        onClick={() => navigate(createPageUrl(module.page))}
                        className="p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-lg transition-all transform hover:scale-105 text-left"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 shadow`}>
                          <module.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-semibold text-slate-900 text-sm">{module.title}</p>
                        <p className="text-xs text-slate-600 mt-1">{module.description}</p>
                        {module.ownerOnly && (
                          <Badge className="mt-2 bg-rose-100 text-rose-700 text-[10px]">Owner Only</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}