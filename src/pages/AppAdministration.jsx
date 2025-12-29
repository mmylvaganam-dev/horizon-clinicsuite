import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, FileText, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';

export default function AppAdministration() {
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
      // Check if user has APP_ADMIN role
      const userRoleNames = userRoles.map(ur => {
        const role = allRoles.find(r => r.id === ur.role_id);
        return role?.role_name;
      });

      const isAppAdmin = userRoleNames.includes('APP_ADMIN');

      if (!isAppAdmin) {
        toast.error('Access denied: APP_ADMIN role required');
        navigate(createPageUrl('Admin'));
        return;
      }

      // Audit log - view app administration
      base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'APP_ADMINISTRATION',
        action: 'view',
        record_type: 'AppAdministration',
        record_id: '',
        metadata: { access_type: 'app_admin' }
      }).catch(err => console.error('Audit log error:', err));
    }
  }, [user, userRoles, allRoles, navigate]);

  const isAppAdmin = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'APP_ADMIN';
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!isAppAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">
            This area is restricted to APP_ADMIN role only.
          </p>
        </Card>
      </div>
    );
  }

  const appAdminModules = [
    {
      title: 'Service Catalog',
      description: 'Configure billing services and pricing',
      icon: Database,
      page: 'AdminServiceCatalog',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Numbering Rules',
      description: 'Configure invoice and document numbering',
      icon: FileText,
      page: 'AdminNumberingRules',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'System Configuration',
      description: 'Application settings and parameters',
      icon: Settings,
      page: 'AdminConfig',
      color: 'from-teal-500 to-teal-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">App Administration</h1>
          <p className="text-slate-500 mt-1">Limited configuration support (no PHI access)</p>
        </div>
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">APP_ADMIN</Badge>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Limited Access</p>
              <p className="text-sm text-blue-700 mt-1">
                APP_ADMIN role has restricted access to configuration settings only. No access to patient health information, clinical data, or financial records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appAdminModules.map((module) => (
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