import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Settings, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';

export default function PlatformSettings() {
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
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

  useEffect(() => {
    if (user && userRoles.length > 0 && allRoles.length > 0) {
      // Check if user has PLATFORM_OWNER role
      const userRoleNames = userRoles.map(ur => {
        const role = allRoles.find(r => r.id === ur.role_id);
        return role?.role_name;
      });

      const isPlatformOwner = userRoleNames.includes('PLATFORM_OWNER');

      if (!isPlatformOwner) {
        toast.error('Access denied: PLATFORM_OWNER role required');
        navigate(createPageUrl('Admin'));
        return;
      }

      // Audit log - view platform settings
      base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PLATFORM_SETTINGS',
        action: 'view',
        record_type: 'PlatformSettings',
        record_id: '',
        metadata: { access_type: 'platform_owner' }
      }).catch(err => console.error('Audit log error:', err));
    }
  }, [user, userRoles, allRoles, navigate]);

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'PLATFORM_OWNER';
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!isPlatformOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">
            This area is restricted to PLATFORM_OWNER role only.
          </p>
        </Card>
      </div>
    );
  }

  const platformModules = [
    {
      title: 'Platform Configuration',
      description: 'Owner-only settings and feature flags',
      icon: Settings,
      page: 'PlatformConfiguration',
      color: 'from-violet-500 to-violet-600'
    },
    {
      title: 'System Configuration',
      description: 'Global system settings and deployment profiles',
      icon: Settings,
      page: 'AdminConfig',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'User Management',
      description: 'Platform-wide user administration',
      icon: Shield,
      page: 'AdminUsers',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Security Validation',
      description: 'Platform security audit and validation',
      icon: Shield,
      page: 'AdminSecurityValidation',
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'System Health',
      description: 'Platform monitoring and diagnostics',
      icon: AlertTriangle,
      page: 'AdminSystemHealth',
      color: 'from-emerald-500 to-emerald-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
          <p className="text-slate-500 mt-1">Owner-level system administration</p>
        </div>
        <Badge className="bg-rose-100 text-rose-700 border-rose-300">PLATFORM_OWNER</Badge>
      </div>

      <Card className="bg-rose-50 border-rose-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Restricted Area</p>
              <p className="text-sm text-rose-700 mt-1">
                All actions in this area are audited. Access is restricted to PLATFORM_OWNER role only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformModules.map((module) => (
          <Card
            key={module.page}
            className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-0 overflow-hidden"
            onClick={() => navigate(createPageUrl(module.page))}
          >
            <div className={`h-2 bg-gradient-to-r ${module.color}`} />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="mt-4 group-hover:text-teal-600 transition-colors">
                {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{module.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}