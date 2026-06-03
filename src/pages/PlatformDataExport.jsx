import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Shield, Activity, AlertTriangle, Database, Zap, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlatformDataExport() {
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

  const dataModules = [
    { 
      title: 'Data Export', 
      description: 'Export data bundles for organizations', 
      icon: FileText, 
      page: 'DataExport',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      title: 'Full System Export', 
      description: 'One-click download all entities + Backup to Google Drive', 
      icon: Zap, 
      page: 'DataExportManager',
      color: 'from-violet-500 to-violet-700'
    },
    { 
      title: 'Export Approvals', 
      description: 'Review and approve export requests', 
      icon: Shield, 
      page: 'AdminExportApprovals',
      color: 'from-green-500 to-green-600'
    },
    { 
      title: 'Retention Policies', 
      description: 'Configure data retention rules', 
      icon: Activity, 
      page: 'AdminRetentionPolicies',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      title: 'Archive Management', 
      description: 'Manage archived records', 
      icon: Database, 
      page: 'AdminArchive',
      color: 'from-orange-500 to-orange-600'
    },
    { 
      title: 'Backup Status', 
      description: 'Monitor backup operations', 
      icon: Activity, 
      page: 'AdminBackups',
      color: 'from-teal-500 to-teal-600'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Data Export Management</h1>
        <p className="text-slate-600 mt-1">Manage data exports, retention policies, and archives across all organizations</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Database className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Platform Data Management:</strong> Control data exports, retention, and archival for all organizations on your platform.
        </AlertDescription>
      </Alert>

      <Card className="border-4 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-blue-900 text-2xl">Data Management Modules</CardTitle>
              <p className="text-blue-700 mt-1">Export, retention, and backup management</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {dataModules.map((module) => (
              <button
                key={module.page}
                onClick={() => navigate(createPageUrl(module.page))}
                className="p-6 rounded-xl border-2 border-blue-200 bg-white hover:shadow-lg transition-all transform hover:scale-105 text-left"
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