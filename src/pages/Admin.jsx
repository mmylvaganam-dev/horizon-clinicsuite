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

  // Get organization roles (exclude platform roles)
  const organizationRoles = allRoles.filter(role => 
    role.role_name && 
    !['PLATFORM_OWNER', 'APP_ADMIN'].includes(role.role_name)
  );

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

  const seedRolesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('seedFunctionalRoles', {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['allRoles']);
      toast.success(`✅ ${data.message}`);
    },
    onError: (error) => {
      toast.error(`Failed to seed roles: ${error.message}`);
    }
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, hasRole, roleName }) => {
      console.log('=== TOGGLE ROLE MUTATION ===');
      console.log('User ID:', userId);
      console.log('Role ID:', roleId);
      console.log('Has Role:', hasRole);
      console.log('Role Name:', roleName);
      console.log('Current User Org:', user?.organization_id);
      
      if (hasRole) {
        // Remove role
        const userRole = selectedUserRoles.find(ur => ur.role_id === roleId);
        console.log('Found user role to delete:', userRole);
        if (userRole) {
          await base44.entities.UserRole.delete(userRole.id);
          return { action: 'removed', roleName };
        }
      } else {
        // Add role
        const createData = {
          user_id: userId,
          role_id: roleId,
          organization_id: user?.organization_id || null,
          is_primary: false
        };
        console.log('Creating UserRole with data:', createData);
        const result = await base44.entities.UserRole.create(createData);
        console.log('Created UserRole:', result);
        return { action: 'added', roleName };
      }
    },
    onSuccess: (data) => {
      console.log('=== MUTATION SUCCESS ===');
      queryClient.invalidateQueries(['selectedUserRoles']);
      queryClient.invalidateQueries(['userRoles']);
      queryClient.invalidateQueries(['allUsers']);
      if (data) {
        toast.success(`✅ Role ${data.action} successfully!`);
      }
    },
    onError: (error) => {
      console.error('=== MUTATION ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast.error(`❌ Failed to update role: ${error.message}`);
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

  // Role icon and color mapping
  const getRoleDisplay = (roleName) => {
    const mapping = {
      'ORG_SUPER_USER': { icon: Shield, color: 'bg-red-500', label: 'Organization Admin' },
      'CLINIC_ADMIN_STAFF': { icon: Settings, color: 'bg-indigo-500', label: 'Clinic Admin' },
      'PHYSICIAN': { icon: Activity, color: 'bg-purple-500', label: 'Physician' },
      'LAB_TECH': { icon: FileText, color: 'bg-cyan-500', label: 'Lab Technician' },
      'PHARMACIST': { icon: Shield, color: 'bg-green-500', label: 'Pharmacist' },
      'DIAGNOSTICS_TECH': { icon: Activity, color: 'bg-orange-500', label: 'Diagnostics Tech' },
      'FINANCE_USER': { icon: DollarSign, color: 'bg-emerald-500', label: 'Finance User' },
      'DIRECTOR_REPORT_VIEWER': { icon: FileText, color: 'bg-blue-500', label: 'Director (Reports)' },
      'READONLY_AUDITOR': { icon: Lock, color: 'bg-slate-500', label: 'Read-Only Auditor' },
    };
    return mapping[roleName] || { icon: Users, color: 'bg-gray-500', label: roleName };
  };

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
          {/* Setup Warning - Show if roles not found */}
          {allRoles.length === 0 || !allRoles.some(r => r.role_name === 'PHYSICIAN') ? (
            <Card className="border-4 border-red-500 bg-gradient-to-r from-red-50 to-rose-50 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <X className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-red-900 mb-2">⚠️ SYSTEM SETUP REQUIRED</h3>
                    <p className="text-red-800 text-lg mb-4">
                      The role system is not set up yet. You need to create the functional roles first before you can assign them to staff members.
                    </p>
                    <Button
                      onClick={() => seedRolesMutation.mutate()}
                      disabled={seedRolesMutation.isPending}
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-8 py-4"
                    >
                      {seedRolesMutation.isPending ? '⏳ SETTING UP ROLES...' : '🔧 SETUP ROLES NOW'}
                    </Button>
                    <p className="text-sm text-red-700 mt-3">
                      This will create 8 functional roles: Physician, Nurse, Lab Tech, Pharmacist, Radiologist, Front Desk, Billing, and Admin
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
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
                  <h3 className="font-bold text-lg mb-2">Click on Role Card</h3>
                  <p className="text-sm text-blue-100">Click the entire card to turn the role ON or OFF</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">3</div>
                  <h3 className="font-bold text-lg mb-2">Done! ✓</h3>
                  <p className="text-sm text-blue-100">They can now access the system with their role</p>
                </div>
              </div>
            </div>
          )}

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
                        {organizationRoles.map((role) => {
                          const hasRole = selectedUserRoles.some(ur => ur.role_id === role.id);
                          const display = getRoleDisplay(role.role_name);

                          const handleClick = () => {
                            console.log('=== ROLE CLICK DEBUG ===');
                            console.log('Role:', role);
                            console.log('Has role:', hasRole);
                            console.log('Selected user:', selectedUser);
                            handleToggleRole(role.id, hasRole, display.label);
                          };

                          return (
                            <button
                              key={role.id}
                              onClick={handleClick}
                              disabled={toggleRoleMutation.isPending}
                              className={`p-6 rounded-2xl border-4 transition-all duration-300 text-left w-full ${
                                hasRole
                                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-100 to-green-100 shadow-2xl'
                                  : 'border-slate-300 bg-white hover:border-blue-500 hover:shadow-xl'
                              } ${toggleRoleMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-102 transform'}`}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`w-20 h-20 rounded-2xl ${display.color} flex items-center justify-center shadow-xl transform transition-transform ${hasRole ? 'scale-110' : ''}`}>
                                  <display.icon className="w-10 h-10 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-2xl text-slate-900">{display.label}</p>
                                  <p className="text-sm text-slate-700 mt-2">{role.description || 'Organization role'}</p>
                                  <p className="text-xs text-slate-500 mt-1">Code: {role.role_name}</p>

                                  <div className="mt-4">
                                    {hasRole && (
                                      <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full w-fit">
                                        <Check className="w-5 h-5" />
                                        <span className="font-bold text-lg">✅ ACTIVE - CLICK TO TURN OFF</span>
                                      </div>
                                    )}
                                    {!hasRole && (
                                      <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full w-fit">
                                        <X className="w-5 h-5" />
                                        <span className="font-bold text-lg">❌ INACTIVE - CLICK TO TURN ON</span>
                                      </div>
                                    )}
                                    {toggleRoleMutation.isPending && (
                                      <div className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full w-fit mt-2">
                                        <span className="font-bold text-lg">⏳ UPDATING...</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
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
                          { capability: 'System Administration', roles: ['ORG_SUPER_USER', 'CLINIC_ADMIN_STAFF'] },
                          { capability: 'User Management', roles: ['ORG_SUPER_USER', 'CLINIC_ADMIN_STAFF'] },
                          { capability: 'Clinical Documentation', roles: ['PHYSICIAN'] },
                          { capability: 'Lab Test Management', roles: ['LAB_TECH'] },
                          { capability: 'Pharmacy Operations', roles: ['PHARMACIST'] },
                          { capability: 'Diagnostics Management', roles: ['DIAGNOSTICS_TECH'] },
                          { capability: 'Finance & Billing', roles: ['FINANCE_USER'] },
                          { capability: 'View Management Reports', roles: ['DIRECTOR_REPORT_VIEWER', 'ORG_SUPER_USER'] },
                          { capability: 'Audit Log Access', roles: ['READONLY_AUDITOR', 'ORG_SUPER_USER'] }
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
                          {organizationRoles.map((role) => {
                            const display = getRoleDisplay(role.role_name);
                            return (
                              <th key={role.id} className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-10 h-10 rounded-lg ${display.color} flex items-center justify-center shadow`}>
                                    <display.icon className="w-5 h-5 text-white" />
                                  </div>
                                  <span className="text-xs font-semibold text-slate-900">{display.label}</span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { capability: 'System Administration', access: ['ORG_SUPER_USER', 'CLINIC_ADMIN_STAFF'] },
                          { capability: 'User Management', access: ['ORG_SUPER_USER', 'CLINIC_ADMIN_STAFF'] },
                          { capability: 'Clinical Access', access: ['PHYSICIAN'] },
                          { capability: 'Lab Management', access: ['LAB_TECH'] },
                          { capability: 'Pharmacy Management', access: ['PHARMACIST'] },
                          { capability: 'Diagnostics Management', access: ['DIAGNOSTICS_TECH'] },
                          { capability: 'Finance & Billing', access: ['FINANCE_USER'] },
                          { capability: 'Management Reports', access: ['DIRECTOR_REPORT_VIEWER', 'ORG_SUPER_USER'] },
                          { capability: 'Audit Logs', access: ['READONLY_AUDITOR', 'ORG_SUPER_USER'] }
                        ].map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-blue-50 transition-colors">
                            <td className="p-3 font-medium text-slate-900">{item.capability}</td>
                            {organizationRoles.map((role) => {
                              const hasAccess = item.access.includes(role.role_name);
                              return (
                                <td key={role.id} className="p-3 text-center">
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