import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, FileText, Activity, AlertTriangle } from 'lucide-react';

export default function PlatformSecurity() {
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

  const securityModules = [
    { 
      title: 'Audit Logs', 
      description: 'View system audit logs across all organizations', 
      icon: FileText, 
      page: 'AdminAuditLogs',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      title: 'Break-Glass Report', 
      description: 'Emergency access audit and monitoring', 
      icon: Shield, 
      page: 'AdminBreakGlassReport',
      color: 'from-red-500 to-red-600'
    },
    { 
      title: 'Security Posture', 
      description: 'Access controls & security monitoring', 
      icon: Shield, 
      page: 'AdminSecurityPosture',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      title: 'Security Validation', 
      description: 'Verify security controls and compliance', 
      icon: Shield, 
      page: 'AdminSecurityValidation',
      color: 'from-orange-500 to-orange-600'
    },
    { 
      title: 'Compliance Checklist', 
      description: 'Deployment validation and compliance', 
      icon: Activity, 
      page: 'AdminComplianceChecklist',
      color: 'from-green-500 to-green-600'
    },
    { 
      title: 'Go-Live Checklist', 
      description: 'Production readiness validation', 
      icon: Activity, 
      page: 'AdminGoLiveChecklist',
      color: 'from-teal-500 to-teal-600'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Security & Compliance</h1>
        <p className="text-slate-600 mt-1">Monitor security, audit logs, and compliance across all organizations</p>
      </div>

      <Alert className="bg-red-50 border-red-200">
        <Shield className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Platform-Wide Security:</strong> These tools monitor and validate security across ALL organizations on your platform.
        </AlertDescription>
      </Alert>

      <Card className="border-4 border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-red-900 text-2xl">Security & Compliance Modules</CardTitle>
              <p className="text-red-700 mt-1">Audit, monitoring, and validation tools</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {securityModules.map((module) => (
              <button
                key={module.page}
                onClick={() => navigate(createPageUrl(module.page))}
                className="p-6 rounded-xl border-2 border-red-200 bg-white hover:shadow-lg transition-all transform hover:scale-105 text-left"
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