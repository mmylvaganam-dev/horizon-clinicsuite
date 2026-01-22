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
    mutationFn: async ({ userId, roleId, hasRole, roleName }) => {
      console.log('Toggle role:', { userId, roleId, hasRole, roleName });
      
      if (hasRole) {
        // Remove role
        const userRole = selectedUserRoles.find(ur => ur.role_id === roleId);
        if (userRole) {
          await base44.entities.UserRole.delete(userRole.id);
          return { action: 'removed', roleName };
        }
      } else {
        // Add role
        await base44.entities.UserRole.create({
          user_id: userId,
          role_id: roleId,
          organization_id: user?.organization_id || null,
          is_primary: false
        });
        return { action: 'added', roleName };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['selectedUserRoles']);
      queryClient.invalidateQueries(['userRoles']);
      if (data) {
        toast.success(`Role ${data.action} successfully!`);
      }
    },
    onError: (error) => {
      console.error('Role toggle error:', error);
      toast.error(`Failed to update role: ${error.message}`);
    }
  });

  const handleToggleRole = (roleId, hasRole, roleName) => {
    if (!selectedUser) {
      toast.error('Please select a user first');
      return;
    }
    if (!roleId) {
      toast.error('Invalid role');
      return;
    }
    toggleRoleMutation.mutate({ userId: selectedUser.id, roleId, hasRole, roleName });
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
          {/* Simple Steps Guide */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <Shield className="w-8 h-8" />
              How to Give Access to Your Staff - 3 Easy Steps
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">1</div>
                <h3 className="font-bold text-lg mb-2">Click on Staff Name</h3>
                <p className="text-sm text-blue-100">Choose which person you want to give access to</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">2</div>
                <h3 className="font-bold text-lg mb-2">Turn ON Their Role</h3>
                <p className="text-sm text-blue-100">Flip the switch for Doctor, Nurse, Admin, etc.</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">3</div>
                <h3 className="font-bold text-lg mb-2">Done! ✓</h3>
                <p className="text-sm text-blue-100">They can now access the system with their role</p>
              </div>
            </div>
          </div>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">1</div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-blue-900 text-2xl">
                    <Users className="w-7 h-7" />
                    Pick a Staff Member
                  </CardTitle>
                  <p className="text-sm text-blue-700 mt-1">Click on any person below to give them access</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-6 rounded-2xl border-3 transition-all duration-200 text-left transform hover:scale-105 ${
                      selectedUser?.id === u.id
                        ? 'border-4 border-blue-600 bg-gradient-to-br from-blue-100 to-blue-200 shadow-2xl'
                        : 'border-2 border-slate-300 bg-white hover:border-blue-400 hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                        selectedUser?.id === u.id ? 'bg-blue-600' : 'bg-slate-300'
                      }`}>
                        <Users className={`w-7 h-7 ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div>
                        <p className={`font-bold text-lg ${selectedUser?.id === u.id ? 'text-blue-900' : 'text-slate-900'}`}>
                          {u.full_name}
                        </p>
                        <p className="text-sm text-slate-600">{u.email}</p>
                      </div>
                    </div>
                    {selectedUser?.id === u.id && (
                      <div className="mt-3 flex items-center gap-2">
                        <Check className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-blue-900">SELECTED ✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Role Toggles */}
              {selectedUser && (
                <div className="mt-6 space-y-6">
                  <Card className="border-4 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 shadow-2xl">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">2</div>
                        <div>
                          <CardTitle className="text-emerald-900 text-2xl flex items-center gap-2">
                            <Shield className="w-7 h-7" />
                            Give Roles to {selectedUser.full_name}
                          </CardTitle>
                          <p className="text-lg text-emerald-700 mt-1 font-semibold">👇 Click the switches below to turn ON or OFF</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {functionalRoles.map((role) => {
                          const roleData = allRoles.find(r => r.role_name === role.name);
                          const hasRole = roleData ? selectedUserRoles.some(ur => ur.role_id === roleData.id) : false;

                          return (
                            <div
                              key={role.name}
                              className={`p-5 rounded-2xl border-4 transition-all duration-300 ${
                                hasRole
                                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-100 to-green-100 shadow-2xl'
                                  : 'border-slate-300 bg-white hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  <div className={`w-16 h-16 rounded-2xl ${role.color} flex items-center justify-center shadow-xl transform transition-transform ${hasRole ? 'scale-110' : ''}`}>
                                    <role.icon className="w-8 h-8 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-xl text-slate-900">{role.label}</p>
                                    <p className="text-sm text-slate-700 mt-1">{role.description}</p>
                                    {!roleData && (
                                      <div className="mt-3 flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full w-fit">
                                        <X className="w-4 h-4" />
                                        <span className="font-bold text-sm">Role not found in system</span>
                                      </div>
                                    )}
                                    {roleData && hasRole && (
                                      <div className="mt-3 flex items-center gap-2 bg-emerald-600 text-white px-3 py-1 rounded-full w-fit">
                                        <Check className="w-4 h-4" />
                                        <span className="font-bold text-sm">ACTIVE</span>
                                      </div>
                                    )}
                                    {roleData && !hasRole && (
                                      <div className="mt-3 flex items-center gap-2 bg-slate-300 text-slate-700 px-3 py-1 rounded-full w-fit">
                                        <X className="w-4 h-4" />
                                        <span className="font-bold text-sm">INACTIVE</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  onClick={() => roleData && handleToggleRole(roleData.id, hasRole, role.label)}
                                  size="lg"
                                  disabled={!roleData || toggleRoleMutation.isPending}
                                  className={`${
                                    hasRole 
                                      ? 'bg-red-600 hover:bg-red-700' 
                                      : 'bg-emerald-600 hover:bg-emerald-700'
                                  } text-white font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all ${!roleData ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {!roleData ? '⚠️ UNAVAILABLE' : toggleRoleMutation.isPending ? '⏳ SAVING...' : hasRole ? '❌ TURN OFF' : '✅ TURN ON'}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Access Capabilities Summary */}
                  <Card className="border-4 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 shadow-2xl">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold">3</div>
                        <div>
                          <CardTitle className="flex items-center gap-2 text-purple-900 text-2xl">
                            <Check className="w-7 h-7" />
                            What Can {selectedUser.full_name} Do?
                          </CardTitle>
                          <p className="text-lg text-purple-700 mt-1">Here's what they can access based on their roles</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { capability: 'Patient Registration', roles: ['FRONT_DESK_STAFF', 'PHYSICIAN', 'NURSE'] },
                          { capability: 'View Patient Records', roles: ['FRONT_DESK_STAFF', 'PHYSICIAN', 'NURSE', 'LAB_TECH', 'PHARMACIST', 'RADIOLOGIST'] },
                          { capability: 'Clinical Documentation', roles: ['PHYSICIAN', 'NURSE'] },
                          { capability: 'Write Prescriptions', roles: ['PHYSICIAN'] },
                          { capability: 'Dispense Medications', roles: ['PHARMACIST'] },
                          { capability: 'Lab Test Orders', roles: ['PHYSICIAN', 'LAB_TECH'] },
                          { capability: 'Lab Results Entry', roles: ['LAB_TECH'] },
                          { capability: 'Radiology Orders', roles: ['PHYSICIAN', 'RADIOLOGIST'] },
                          { capability: 'Billing & Invoicing', roles: ['BILLING_STAFF', 'FRONT_DESK_STAFF'] },
                          { capability: 'Inventory Management', roles: ['PHARMACIST', 'CLINIC_ADMIN_STAFF'] },
                          { capability: 'System Configuration', roles: ['CLINIC_ADMIN_STAFF'] },
                          { capability: 'User Management', roles: ['CLINIC_ADMIN_STAFF'] },
                          { capability: 'Reports & Analytics', roles: ['CLINIC_ADMIN_STAFF', 'BILLING_STAFF'] }
                        ].map((item, idx) => {
                          const userHasAccess = item.roles.some(roleName => {
                            const roleData = allRoles.find(r => r.role_name === roleName);
                            return roleData && selectedUserRoles.some(ur => ur.role_id === roleData.id);
                          });

                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-xl border-3 ${
                                userHasAccess
                                  ? 'bg-gradient-to-r from-emerald-100 to-green-100 border-4 border-emerald-400'
                                  : 'bg-gradient-to-r from-red-100 to-rose-100 border-4 border-red-400'
                              }`}
                            >
                              <span className="font-bold text-lg text-slate-900">{item.capability}</span>
                              <div className="flex items-center gap-3">
                                {userHasAccess ? (
                                  <>
                                    <Check className="w-8 h-8 text-emerald-600" />
                                    <span className="font-bold text-xl text-emerald-700">YES ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-8 h-8 text-red-600" />
                                    <span className="font-bold text-xl text-red-700">NO ✗</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!selectedUser && (
                <div className="text-center py-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl border-4 border-dashed border-slate-400">
                  <Users className="w-24 h-24 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-700 font-bold text-2xl">👆 Click on a Staff Member Above</p>
                  <p className="text-lg text-slate-600 mt-2">Choose someone to give them access to the system</p>
                </div>
              )}

              {/* Permission Matrix Chart */}
              <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">Roles & Access Capabilities Matrix</CardTitle>
                  <p className="text-sm text-slate-600">Reference guide showing what each role can do</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-blue-200">
                          <th className="text-left p-3 font-bold text-slate-900">Access Capability</th>
                          {functionalRoles.map((role) => (
                            <th key={role.name} className="p-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center shadow`}>
                                  <role.icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-slate-900">{role.label}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { capability: 'Patient Registration', defaultAccess: { FRONT_DESK_STAFF: true, PHYSICIAN: true, NURSE: true } },
                          { capability: 'View Patient Records', defaultAccess: { FRONT_DESK_STAFF: true, PHYSICIAN: true, NURSE: true, LAB_TECH: true, PHARMACIST: true, RADIOLOGIST: true } },
                          { capability: 'Clinical Documentation', defaultAccess: { PHYSICIAN: true, NURSE: true } },
                          { capability: 'Write Prescriptions', defaultAccess: { PHYSICIAN: true } },
                          { capability: 'Dispense Medications', defaultAccess: { PHARMACIST: true } },
                          { capability: 'Lab Test Orders', defaultAccess: { PHYSICIAN: true, LAB_TECH: true } },
                          { capability: 'Lab Results Entry', defaultAccess: { LAB_TECH: true } },
                          { capability: 'Radiology Orders', defaultAccess: { PHYSICIAN: true, RADIOLOGIST: true } },
                          { capability: 'Billing & Invoicing', defaultAccess: { BILLING_STAFF: true, FRONT_DESK_STAFF: true } },
                          { capability: 'Inventory Management', defaultAccess: { PHARMACIST: true, CLINIC_ADMIN_STAFF: true } },
                          { capability: 'System Configuration', defaultAccess: { CLINIC_ADMIN_STAFF: true } },
                          { capability: 'User Management', defaultAccess: { CLINIC_ADMIN_STAFF: true } },
                          { capability: 'Reports & Analytics', defaultAccess: { CLINIC_ADMIN_STAFF: true, BILLING_STAFF: true } }
                        ].map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-blue-50 transition-colors">
                            <td className="p-3 font-medium text-slate-900">{item.capability}</td>
                            {functionalRoles.map((role) => {
                              const hasAccess = item.defaultAccess[role.name] || false;
                              return (
                                <td key={role.name} className="p-3 text-center">
                                  <div className={`py-2 px-3 rounded-lg ${
                                    hasAccess
                                      ? 'bg-emerald-100 border-2 border-emerald-300'
                                      : 'bg-red-100 border-2 border-red-300'
                                  }`}>
                                    {hasAccess ? (
                                      <Check className="w-6 h-6 text-emerald-600 mx-auto" />
                                    ) : (
                                      <X className="w-6 h-6 text-red-600 mx-auto" />
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
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