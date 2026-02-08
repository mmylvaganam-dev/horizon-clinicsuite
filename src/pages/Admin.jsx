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
  ChevronRight,
  Info,
  Globe,
  Building,
  Trash2,
  TestTube,
  Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import { useOrganization } from '@/components/OrganizationProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SalesActivityManager from '../components/admin/SalesActivityManager';
import SystemHealthChecker from '../components/admin/SystemHealthChecker';

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const { selectedOrgId, isPlatformOwner: isPlatformOwnerContext } = useOrganization();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsersUnfiltered = [] } = useQuery({
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

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  // Get organization roles (exclude platform roles)
  const organizationRoles = allRoles.filter(role => {
    const roleCode = role.code || role.role_name;
    return roleCode && !['PLATFORM_OWNER', 'APP_ADMIN'].includes(roleCode);
  });

  const { data: selectedUserRoles = [] } = useQuery({
    queryKey: ['selectedUserRoles', selectedUser?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: selectedUser.id });
      return roles;
    },
    enabled: !!selectedUser,
  });

  const isPlatformOwner = user?.email === 'madhawaekanayake@gmail.com' || 
                         user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                         user?.is_platform_owner === true ||
                         userRoles.some(ur => {
                           const role = allRoles.find(r => r.id === ur.role_id);
                           return role?.code === 'PLATFORM_OWNER';
                         });

  // CRITICAL: Get selected company from dropdown
  const selectedCompanyId = selectedOrgId && organizations.length > 0
    ? organizations.find(org => org.id === selectedOrgId)?.company_id
    : null;

  // CRITICAL: Show users for the selected organization only
  // Platform owner: show users from selected org's company
  // Regular admin: show all users (no filtering)
  const allUsers = isPlatformOwner && selectedOrgId
    ? allUsersUnfiltered.filter(u => u.organization_id === selectedOrgId || !u.organization_id)
    : allUsersUnfiltered;

  console.log('🔴 Admin Page Filter:', {
    selectedOrgId,
    selectedCompanyId,
    totalUsers: allUsersUnfiltered.length,
    filteredUsers: allUsers.length
  });

  const isAppAdmin = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    const roleCode = role?.code || role?.role_name;
    return roleCode === 'APP_ADMIN';
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) {
        throw new Error('Please select an organization first');
      }
      const response = await base44.functions.invoke('clearAllSalesData', { 
        organizationId: selectedOrgId 
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(`✅ Cleared ${data.cleared.pharmacySales} sales, ${data.cleared.auditLogs} logs successfully!`);
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  const generateTestSaleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) {
        throw new Error('Please select an organization first');
      }
      const response = await base44.functions.invoke('generateTestSale', { 
        organizationId: selectedOrgId,
        locationId: organizations.find(o => o.id === selectedOrgId)?.location_id
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(`✅ Test sale created: ${data.sale.saleNumber} - ${data.sale.itemCount} items`);
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      // Get selected organization for assignment
      if (!selectedOrgId) {
        throw new Error('Please select an organization from the dropdown first');
      }
      
      console.log('🔵 Step 1: Inviting user:', email, 'with role:', role);
      
      // Invite user - this creates the user account
      await base44.users.inviteUser(email, role);
      
      console.log('✅ Step 2: User invited, waiting 2 seconds for user creation...');
      
      // Wait longer for user to be fully created in database
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🔵 Step 3: Now assigning to org:', selectedOrgId);
      
      // Auto-assign to selected organization using email
      const assignResponse = await base44.functions.invoke('assignUserToOrganization', {
        userEmail: email,
        organizationId: selectedOrgId
      });
      
      console.log('✅ Step 4: Assignment complete:', assignResponse.data);
      
      return { email, role, orgId: selectedOrgId };
    },
    onSuccess: async (data) => {
      console.log('✅ Step 5: Success! Refreshing data...');
      await queryClient.invalidateQueries(['allUsers']);
      await queryClient.invalidateQueries(['userRoles']);
      toast.success(`✅ User ${data.email} invited and assigned to organization!`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
    },
    onError: (error) => {
      console.error('❌ Invite mutation error:', error);
      toast.error(`❌ Error: ${error.message || 'Failed to invite user'}`);
    }
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
      
      if (hasRole) {
        // Remove role
        const userRole = selectedUserRoles.find(ur => ur.role_id === roleId);
        console.log('Found user role to delete:', userRole);
        if (userRole) {
          await base44.entities.UserRole.delete(userRole.id);
          return { action: 'removed', roleName };
        }
      } else {
        // Add role - get organization_id
        let orgId = user?.organization_id;
        if (!orgId && organizations.length > 0) {
          orgId = organizations[0].id;
        }
        
        if (!orgId) {
          throw new Error('Organization ID is required but not found');
        }

        const createData = {
          user_id: userId,
          role_id: roleId,
          organization_id: orgId,
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
      console.error('Error response:', error.response?.data);
      toast.error(`❌ Failed: ${error.response?.data?.message || error.message}`);
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
      category: 'Users & Access Control',
      description: 'Add staff and grant roles',
      icon: Users,
      color: 'from-teal-500 to-teal-600',
      modules: [
        { title: 'Organization Users', description: 'Manage organization users', icon: Users, page: 'OrganizationUserManagement' },
        { title: 'Users & Roles', description: 'Manage user roles and permissions', icon: Users, page: 'AdminUsers' },
        { title: 'Role Standards', description: 'Standardized RBAC roles', icon: Shield, page: 'AdminRoleStandards' },
        { title: 'Role Permissions', description: 'View role permission matrix', icon: Shield, page: 'AdminRolePermissions' },
        { title: 'Permissions', description: 'Configure role permissions', icon: Shield, page: 'AdminPermissions' },
        { title: 'Permission Matrix', description: 'Visual permission editor', icon: Grid3X3, page: 'AdminPermissionMatrix' },
      ]
    },
    {
      category: 'Organization Branding & Pricing',
      description: 'Configure branding and service prices',
      icon: Settings,
      color: 'from-blue-500 to-blue-600',
      modules: [
        { title: 'Branding', description: 'Organization branding', icon: Settings, page: 'AdminOrganizationBranding' },
        { title: 'Service Catalog', description: 'Manage services and pricing', icon: Grid3X3, page: 'AdminServiceCatalog' },
        { title: 'Pricing & Catalogs', description: 'Configure service fees', icon: DollarSign, page: 'PricingCatalogs' },
      ]
    },
    {
      category: 'Modules & Configuration',
      description: 'Enable modules and configure settings',
      icon: Grid3X3,
      color: 'from-indigo-500 to-indigo-600',
      modules: [
        { title: 'Module Toggles', description: 'Enable/disable modules', icon: Grid3X3, page: 'AdminModuleToggles' },
        { title: 'Configuration', description: 'System configuration', icon: Settings, page: 'AdminConfig' },
        { title: 'Modules', description: 'Manage module access', icon: Grid3X3, page: 'AdminModules' },
      ]
    },
    {
      category: 'Financial Configuration',
      description: 'Billing, accounting, and tax rules',
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      modules: [
        { title: 'Billing', description: 'Invoice and payment management', icon: DollarSign, page: 'Billing' },
        { title: 'Tax Rules', description: 'Configure tax rates', icon: Settings, page: 'AdminTaxRules' },
        { title: 'Numbering Rules', description: 'Document numbering formats', icon: Key, page: 'AdminNumberingRules' },
        { title: 'Chart of Accounts', description: 'Accounting accounts', icon: Grid3X3, page: 'AdminChartOfAccounts' },
        { title: 'Posting Rules', description: 'Accounting automation', icon: Settings, page: 'AdminPostingRules' },
      ]
    },
    {
      category: 'System Operations',
      description: 'Monitoring, backups, and maintenance (Platform Owner Only)',
      icon: Activity,
      color: 'from-emerald-500 to-emerald-600',
      modules: [
        { title: 'System Health', description: 'Data integrity monitoring', icon: Activity, page: 'AdminSystemHealth', ownerOnly: true },
        { title: 'Organization Activity', description: 'Aggregate activity metrics', icon: Activity, page: 'AdminOrganizationActivity', ownerOnly: true },
        { title: 'System Version', description: 'Version control & schema lock', icon: Shield, page: 'AdminSystemVersion', ownerOnly: true },
        { title: 'Backup Status', description: 'Backup operations', icon: Activity, page: 'AdminBackups', ownerOnly: true },
      ]
    },
  ];

  // Role icon and color mapping
  const getRoleDisplay = (role) => {
    const roleCode = role.code || role.role_name || '';
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
      'FRONT_DESK_STAFF': { icon: UserCheck, color: 'bg-blue-500', label: 'Front Desk Staff' },
      'NURSE': { icon: Users, color: 'bg-pink-500', label: 'Nurse' },
      'RADIOLOGIST': { icon: Activity, color: 'bg-orange-500', label: 'Radiologist' },
      'BILLING_STAFF': { icon: DollarSign, color: 'bg-emerald-500', label: 'Billing Staff' },
    };
    return mapping[roleCode] || { icon: Users, color: 'bg-gray-500', label: role.name || roleCode };
  };

  return (
    <div className="space-y-6">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Administration</h1>
        <p className="text-slate-500 mt-1">Manage users, permissions, and system configuration</p>
      </div>
      <div className="flex items-center gap-3">
        {isPlatformOwner && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Users className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User to Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {selectedOrgId ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900 font-medium">
                      User will be invited to: <span className="font-bold">{organizations.find(o => o.id === selectedOrgId)?.name}</span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                    <p className="text-sm text-yellow-900 font-medium">
                      ⚠️ Select an organization from dropdown first, then invite users
                    </p>
                  </div>
                )}
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole })}
                  disabled={!inviteEmail || !selectedOrgId || inviteUserMutation.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {inviteUserMutation.isPending ? 'Inviting...' : selectedOrgId ? 'Send Invitation' : 'Select Organization First'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
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
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="organization" className="flex items-center gap-2 bg-blue-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Building className="w-4 h-4" />
            Organization Admin
          </TabsTrigger>
        </TabsList>

        {/* Organization Admin Tab */}
        <TabsContent value="organization" className="space-y-6">
          <div className="bg-white border-l-4 border-teal-600 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Organization Administration</h2>
                <p className="text-slate-600 text-sm mt-1">Manage staff access, roles, and financial controls</p>
              </div>
            </div>
          </div>

          {/* Bank Statement Access Control - Org Admin Only */}
          {(isPlatformOwner || isAppAdmin) && (
            <Card className="border-l-4 border-blue-600">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Bank Statement Access Control
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">Grant or revoke bank statement viewing permissions</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {allUsers.map((u) => {
                    const hasAccess = u.bank_statement_access === true;
                    return (
                      <div 
                        key={u.id} 
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${hasAccess ? 'bg-teal-600' : 'bg-slate-400'}`}>
                            {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{u.full_name || u.email}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                        <Button
                          onClick={async () => {
                            try {
                              await base44.entities.User.update(u.id, { bank_statement_access: !hasAccess });
                              queryClient.invalidateQueries(['allUsers']);
                              toast.success(hasAccess ? 'Bank access revoked' : 'Bank access granted');
                            } catch (error) {
                              toast.error('Failed to update access: ' + error.message);
                            }
                          }}
                          variant={hasAccess ? "destructive" : "default"}
                          size="sm"
                          className={hasAccess ? '' : 'bg-teal-600 hover:bg-teal-700'}
                        >
                          {hasAccess ? (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Revoke
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Grant Access
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Health Check - Platform Owner Only */}
          {isPlatformOwner && (
            <Card className="border-l-4 border-green-600">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
                  <Activity className="w-5 h-5 text-green-600" />
                  System Health Check
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">Comprehensive system diagnostics and validation</p>
              </CardHeader>
              <CardContent className="pt-6">
                <SystemHealthChecker organizationId={selectedOrgId} />
              </CardContent>
            </Card>
          )}

          {/* Sales Management - Org Admin & Platform Owner */}
          {(isPlatformOwner || isAppAdmin) && (
            <Card className="border-l-4 border-orange-600">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
                  <Package className="w-5 h-5 text-orange-600" />
                  Sales Management
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">View and manage sales records</p>
              </CardHeader>
              <CardContent className="pt-6">
                <SalesActivityManager 
                  organizationId={selectedOrgId}
                  isPlatformOwner={isPlatformOwner}
                  clearDataMutation={clearDataMutation}
                  generateTestSaleMutation={generateTestSaleMutation}
                />
              </CardContent>
            </Card>
          )}

          {/* Role Assignment Section - For Platform Owner and Org Admin */}
          {(isPlatformOwner || isAppAdmin) && allRoles.some(r => (r.code || r.role_name) === 'PHYSICIAN') && (
            <Card className="border-l-4 border-indigo-600">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Role Assignment
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">Assign functional roles to staff members</p>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Step 1: Select User */}
                <div>
                  <h3 className="font-medium text-slate-900 mb-3">1. Select Staff Member</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {allUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          selectedUser?.id === u.id
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${
                            selectedUser?.id === u.id ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{u.full_name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                        {selectedUser?.id === u.id && (
                          <div className="mt-2 flex items-center gap-1 text-teal-700 text-xs font-medium">
                            <Check className="w-3 h-3" /> Selected
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Assign Roles */}
                {selectedUser && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-3">2. Assign Roles to {selectedUser.full_name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {organizationRoles.map((role) => {
                        const hasRole = selectedUserRoles.some(ur => ur.role_id === role.id);
                        const display = getRoleDisplay(role);

                        return (
                          <button
                            key={role.id}
                            onClick={() => handleToggleRole(role.id, hasRole, display.label)}
                            disabled={toggleRoleMutation.isPending}
                            className={`p-3 rounded-lg border transition-all text-left ${
                              hasRole
                                ? 'border-teal-600 bg-teal-50'
                                : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${display.color} flex items-center justify-center`}>
                                <display.icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 text-sm">{display.label}</p>
                                <p className="text-xs text-slate-500">{role.description || role.code}</p>
                              </div>
                              <div>
                                {hasRole ? (
                                  <Check className="w-5 h-5 text-teal-600" />
                                ) : (
                                  <X className="w-5 h-5 text-slate-300" />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!selectedUser && (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm text-slate-600">Select a staff member above to assign roles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {adminCategories
            .filter(cat => cat.modules.some(m => !m.ownerOnly))
            .map((category, idx) => (
              <Card key={idx} className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
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
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {category.modules
                      .filter(m => !m.ownerOnly)
                      .map((module) => (
                        <button
                          key={module.page}
                          onClick={() => navigate(createPageUrl(module.page))}
                          className="p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all transform hover:scale-105 text-left"
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 shadow`}>
                            <module.icon className="w-5 h-5 text-white" />
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">{module.title}</p>
                          <p className="text-xs text-slate-600 mt-1">{module.description}</p>
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* User Access Control Tab (Old - keeping for role assignment UI) */}
        <TabsContent value="access" className="space-y-6">
          {/* Setup Warning - Show if roles not found */}
          {allRoles.length === 0 || !allRoles.some(r => (r.code || r.role_name) === 'PHYSICIAN') ? (
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
                          const display = getRoleDisplay(role);

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
                                  <p className="text-xs text-slate-500 mt-1">Code: {role.code || role.role_name}</p>

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
                            const roleData = allRoles.find(r => (r.code || r.role_name) === roleName);
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
                            const display = getRoleDisplay(role);
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
                              const roleCode = role.code || role.role_name;
                              const hasAccess = item.access.includes(roleCode);
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

        {/* Modules & Configuration Tab */}
        <TabsContent value="modules" className="space-y-6">
          {/* Platform Owner: Global Module Control */}
          {isPlatformOwner && (
            <Card className="border-4 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 shadow-2xl">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-purple-900 text-2xl">Global Module Control</CardTitle>
                      <div className="group relative">
                        <Info className="w-5 h-5 text-purple-600 cursor-help" />
                        <div className="hidden group-hover:block absolute left-0 top-6 w-80 bg-purple-900 text-white p-4 rounded-xl shadow-2xl z-50">
                          <p className="font-bold text-lg mb-2">🌍 Platform Owner Only</p>
                          <p className="text-sm">As the platform owner, you control which modules are available GLOBALLY across all organizations. Turn modules ON here to make them available to organizations.</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-purple-700 mt-2 text-lg font-semibold">Turn modules ON/OFF for the entire platform - available to ALL organizations</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-purple-100 border-4 border-purple-300 rounded-xl p-4 mb-4">
                  <p className="text-purple-900 font-bold text-lg">📌 HOW IT WORKS:</p>
                  <ul className="mt-2 space-y-2 text-purple-800">
                    <li className="flex items-start gap-2">
                      <span className="text-2xl">1️⃣</span>
                      <span>YOU (Platform Owner) turn modules ON here → Makes them available globally</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-2xl">2️⃣</span>
                      <span>Organization Owners can then enable/disable those modules for their specific practice</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => navigate(createPageUrl('AdminModuleToggles'))}
                  className="w-full p-6 rounded-2xl border-4 border-purple-400 bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-102"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Grid3X3 className="w-12 h-12 text-purple-600" />
                      <div className="text-left">
                        <p className="font-bold text-2xl text-purple-900">Module Toggles</p>
                        <p className="text-purple-700 mt-1">Enable/disable modules globally for all organizations</p>
                      </div>
                    </div>
                    <ChevronRight className="w-8 h-8 text-purple-600" />
                  </div>
                </button>
              </CardContent>
            </Card>
          )}

          {/* Organization Level: Module & Configuration Control */}
          <Card className="border-4 border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-2xl">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Building className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-teal-900 text-2xl">Organization Configuration</CardTitle>
                    <div className="group relative">
                      <Info className="w-5 h-5 text-teal-600 cursor-help" />
                      <div className="hidden group-hover:block absolute left-0 top-6 w-80 bg-teal-900 text-white p-4 rounded-xl shadow-2xl z-50">
                        <p className="font-bold text-lg mb-2">🏥 For Your Practice</p>
                        <p className="text-sm">Control which modules YOUR staff can access and configure settings specific to YOUR organization (fees, templates, workflows).</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-teal-700 mt-2 text-lg font-semibold">Enable modules for your staff & customize settings for your practice</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-teal-100 border-4 border-teal-300 rounded-xl p-4 mb-4">
                <p className="text-teal-900 font-bold text-lg">📌 WHEN TO USE:</p>
                <ul className="mt-2 space-y-2 text-teal-800">
                  <li className="flex items-start gap-2">
                    <span className="text-2xl">✅</span>
                    <span><strong>Module Toggles:</strong> Turn pharmacy, lab, or radiology modules ON/OFF for your organization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-2xl">⚙️</span>
                    <span><strong>Configuration:</strong> Set consultation fees, tax rates, templates unique to your practice</span>
                  </li>
                </ul>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate(createPageUrl('AdminModuleToggles'))}
                  className="p-6 rounded-2xl border-4 border-teal-300 bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-102"
                >
                  <Grid3X3 className="w-12 h-12 text-teal-600 mb-3" />
                  <p className="font-bold text-xl text-teal-900">Module Toggles</p>
                  <p className="text-teal-700 text-sm mt-2">Enable/disable modules for your organization's staff</p>
                </button>

                <button
                  onClick={() => navigate(createPageUrl('AdminConfig'))}
                  className="p-6 rounded-2xl border-4 border-cyan-300 bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-102"
                >
                  <Settings className="w-12 h-12 text-cyan-600 mb-3" />
                  <p className="font-bold text-xl text-cyan-900">Configuration</p>
                  <p className="text-cyan-700 text-sm mt-2">Set fees, templates, and settings for your practice</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  Organization System Settings
                  <div className="group relative">
                    <Info className="w-5 h-5 cursor-help" />
                    <div className="hidden group-hover:block absolute left-0 top-6 w-96 bg-blue-900 text-white p-4 rounded-xl shadow-2xl z-50">
                      <p className="font-bold text-lg mb-2">🏥 FOR YOUR PRACTICE</p>
                      <p className="text-sm">These settings are for managing YOUR organization - finances, operations, and system monitoring for your clinic/hospital.</p>
                    </div>
                  </div>
                </h2>
                <p className="text-blue-100 text-lg mt-1">Financial, operational, and system monitoring tools</p>
              </div>
            </div>
          </div>

          {adminCategories
            .filter(cat => cat.modules.some(m => !m.ownerOnly))
            .map((category, idx) => (
              <Card key={idx} className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
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
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {category.modules
                      .filter(m => !m.ownerOnly)
                      .map((module) => (
                        <button
                          key={module.page}
                          onClick={() => navigate(createPageUrl(module.page))}
                          className="p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all transform hover:scale-105 text-left"
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 shadow`}>
                            <module.icon className="w-5 h-5 text-white" />
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">{module.title}</p>
                          <p className="text-xs text-slate-600 mt-1">{module.description}</p>
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}