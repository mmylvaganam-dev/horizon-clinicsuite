import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, FileText, Activity, AlertTriangle, Zap } from 'lucide-react';

export default function PlatformIntegrations() {
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

  const integrationModules = [
    { 
      title: 'Patient Portal', 
      description: 'Patient portal account management', 
      icon: Users, 
      page: 'AdminPatientPortal',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      title: 'Government Reporting', 
      description: 'Regulatory compliance reports', 
      icon: FileText, 
      page: 'GovernmentReporting',
      color: 'from-green-500 to-green-600'
    },
    { 
      title: 'Partner Management', 
      description: 'Manage referral partners', 
      icon: Users, 
      page: 'PartnerManagement',
      color: 'from-blue-500 to-blue-600'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">External Integrations</h1>
        <p className="text-slate-600 mt-1">Manage patient portals, government reporting, and partner integrations</p>
      </div>

      <Alert className="bg-purple-50 border-purple-200">
        <Zap className="w-4 h-4 text-purple-600" />
        <AlertDescription className="text-purple-900">
          <strong>Platform Integrations:</strong> Configure external integrations for all organizations on your platform.
        </AlertDescription>
      </Alert>

      <Card className="border-4 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-purple-900 text-2xl">Integration Modules</CardTitle>
              <p className="text-purple-700 mt-1">External services and partner management</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {integrationModules.map((module) => (
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