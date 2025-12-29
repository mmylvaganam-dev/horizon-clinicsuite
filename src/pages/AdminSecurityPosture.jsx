import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle, AlertTriangle, FileText, Loader2, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function AdminSecurityPosture() {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => base44.entities.Permission.list(),
  });

  const { data: rolePermissions = [], isLoading: loadingRolePerms } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list(),
  });

  const { data: auditLogs = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['recentAuditLogs'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.list('-timestamp', 10);
      return logs;
    },
  });

  const { data: breakGlassLogs = [], isLoading: loadingBreakGlass } = useQuery({
    queryKey: ['breakGlassLogs'],
    queryFn: () => base44.entities.BreakGlassLog.list('-started_at', 10),
  });

  const { data: releases = [], isLoading: loadingReleases } = useQuery({
    queryKey: ['recentReleases'],
    queryFn: () => base44.entities.ReleaseToPatient.list('-created_date', 10),
  });

  const { data: securityReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['securityReports'],
    queryFn: async () => {
      const artifacts = await base44.entities.DocumentArtifact.list('-created_at');
      return artifacts.filter(a => a.artifact_type === 'security_report');
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateSecurityReport', {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['securityReports'] });
    },
  });

  const isLoading = loadingRoles || loadingPermissions || loadingRolePerms || 
                     loadingAudits || loadingBreakGlass || loadingReleases || loadingReports;

  // Audit logging status
  const auditLoggingActive = auditLogs.length > 0;
  const lastAuditLog = auditLogs[0];

  // Break-glass status
  const breakGlassEnabled = breakGlassLogs.length > 0;
  const recentBreakGlass = breakGlassLogs.slice(0, 5);

  // Portal result gating status
  const portalGatingActive = releases.length > 0;
  const lastRelease = releases[0];

  // High-risk permissions (export, print, delete)
  const highRiskPermissions = permissions.filter(p => 
    p.permission_name.toLowerCase().includes('export') ||
    p.permission_name.toLowerCase().includes('print') ||
    p.permission_name.toLowerCase().includes('delete') ||
    p.permission_name.toLowerCase().includes('void')
  );

  // Role permissions mapping
  const getRolePermissions = (roleId) => {
    const rolePerms = rolePermissions.filter(rp => rp.role_id === roleId);
    return rolePerms.map(rp => permissions.find(p => p.id === rp.permission_id)).filter(Boolean);
  };

  const roleSecurityProfile = roles.map(role => {
    const perms = getRolePermissions(role.id);
    const highRiskPerms = perms.filter(p => highRiskPermissions.some(hr => hr.id === p.id));
    return {
      role,
      permissions: perms,
      highRiskPermissions: highRiskPerms,
      riskLevel: highRiskPerms.length > 3 ? 'high' : highRiskPerms.length > 0 ? 'medium' : 'low'
    };
  });

  const securityScore = [
    auditLoggingActive,
    breakGlassEnabled || breakGlassLogs.length === 0, // enabled or not used is ok
    portalGatingActive,
    roleSecurityProfile.filter(r => r.riskLevel === 'high').length === 0
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Security Posture</h1>
          <p className="text-slate-500 mt-1">Monitor security controls and access policies</p>
        </div>
        <Button 
          onClick={() => generateReportMutation.mutate()}
          disabled={generateReportMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {generateReportMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate Security Report
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={securityScore === 4 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Security Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Shield className={`w-8 h-8 ${securityScore === 4 ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div>
                    <p className={`text-3xl font-bold ${securityScore === 4 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {securityScore}/4
                    </p>
                    <p className="text-xs text-slate-600">Controls active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Audit Logging</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {auditLoggingActive ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <Badge variant="outline" className={auditLoggingActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>
                    {auditLoggingActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {lastAuditLog && (
                  <p className="text-xs text-slate-500">
                    Last log: {format(new Date(lastAuditLog.timestamp), 'MMM d, h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Break-Glass</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                    Enabled
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{breakGlassLogs.length} total events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Portal Gating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {portalGatingActive ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <Badge variant="outline" className={portalGatingActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                    {portalGatingActive ? 'Active' : 'Not Used'}
                  </Badge>
                </div>
                {lastRelease && (
                  <p className="text-xs text-slate-500">
                    Last release: {format(new Date(lastRelease.created_date), 'MMM d, h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Role Permission Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roleSecurityProfile.map(profile => (
                  <div key={profile.role.id} className="p-4 rounded-lg border bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-slate-900">{profile.role.role_name}</p>
                          <Badge 
                            variant="outline" 
                            className={
                              profile.riskLevel === 'high' ? 'bg-rose-100 text-rose-700' :
                              profile.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }
                          >
                            {profile.riskLevel.toUpperCase()} RISK
                          </Badge>
                          <Badge variant="outline">{profile.permissions.length} permissions</Badge>
                        </div>
                        {profile.highRiskPermissions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-semibold text-slate-700 mb-1">High-Risk Permissions:</p>
                            <div className="flex flex-wrap gap-1">
                              {profile.highRiskPermissions.map(perm => (
                                <Badge key={perm.id} variant="outline" className="text-xs bg-rose-50 text-rose-700">
                                  {perm.permission_name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {recentBreakGlass.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Recent Break-Glass Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentBreakGlass.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{log.user_email}</p>
                        <p className="text-xs text-slate-600">Patient: {log.patient_id}</p>
                        <p className="text-xs text-slate-500">{log.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {format(new Date(log.started_at), 'MMM d, h:mm a')}
                        </p>
                        {log.approved_by && (
                          <Badge variant="outline" className="mt-1 text-xs bg-emerald-50 text-emerald-700">
                            Approved
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {securityReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {securityReports.slice(0, 5).map(report => (
                    <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">Security Posture Report</p>
                          <p className="text-xs text-slate-500">
                            Generated by {report.created_by_email} • {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{report.artifact_type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}