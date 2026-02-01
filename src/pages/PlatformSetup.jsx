import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  MapPin, 
  Shield, 
  Settings,
  Globe,
  AlertTriangle
} from 'lucide-react';

export default function PlatformSetup() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPlatformOwner = currentUser?.email === 'madhawaekanayake@gmail.com' || 
                         currentUser?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                         currentUser?.is_platform_owner;

  if (!isPlatformOwner) {
    return (
      <div className="space-y-8">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Access Denied:</strong> Only the platform owner can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const setupModules = [
    { 
      title: 'Company Profile', 
      description: 'Business details and company information', 
      icon: Building2, 
      page: 'FinanceCompanies',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      title: 'Organizations', 
      description: 'Create & manage multiple organizations/companies', 
      icon: Building2, 
      page: 'AdminOrganizations',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      title: 'Module Permissions', 
      description: 'Control which modules each organization can access', 
      icon: Shield, 
      page: 'OrganizationModulePermissions',
      color: 'from-red-500 to-red-600'
    },
    { 
      title: 'Locations', 
      description: 'Manage clinics & branches across organizations', 
      icon: MapPin, 
      page: 'AdminLocations',
      color: 'from-green-500 to-green-600'
    },
    { 
      title: 'Global Branding', 
      description: 'White-label branding configuration', 
      icon: Settings, 
      page: 'AdminOrganizationBranding',
      color: 'from-indigo-500 to-indigo-600'
    },
    { 
      title: 'Platform Configuration', 
      description: 'Global platform settings and configuration', 
      icon: Settings, 
      page: 'PlatformConfiguration',
      color: 'from-teal-500 to-teal-600'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Platform Setup</h1>
        <p className="text-slate-600 mt-1">Create and manage multiple organizations/companies on your platform</p>
      </div>

      <Alert className="bg-purple-50 border-purple-200">
        <Globe className="w-4 h-4 text-purple-600" />
        <AlertDescription className="text-purple-900">
          <strong>Multi-Tenant Platform:</strong> You can create multiple organizations (companies) and sell individual access to each. Each organization has its own admin who manages only their organization.
        </AlertDescription>
      </Alert>

      <Card className="border-4 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-purple-900 text-2xl">Platform Setup Modules</CardTitle>
              <p className="text-purple-700 mt-1">Configure organizations, permissions, and global settings</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {setupModules.map((module) => (
              <button
                key={module.page}
                onClick={() => navigate(createPageUrl(module.page))}
                className="p-6 rounded-xl border-2 border-purple-200 bg-white hover:shadow-lg transition-all transform hover:scale-105 text-left"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center mb-3 shadow`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-slate-900">{module.title}</p>
                <p className="text-xs text-slate-600 mt-2">{module.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}