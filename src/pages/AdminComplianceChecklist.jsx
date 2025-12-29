import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function AdminComplianceChecklist() {
  const { data: deploymentProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['deploymentProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.DeploymentProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: exportBundles = [], isLoading: loadingExports } = useQuery({
    queryKey: ['exportBundles'],
    queryFn: () => base44.entities.ExportBundle.list(),
  });

  const { data: auditLogs = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.list('-timestamp', 10);
      return logs;
    },
  });

  const { data: releaseQueue = [], isLoading: loadingReleases } = useQuery({
    queryKey: ['releaseQueue'],
    queryFn: () => base44.entities.ReleaseToPatient.list('-created_date', 10),
  });

  const { data: breakGlassLogs = [], isLoading: loadingBreakGlass } = useQuery({
    queryKey: ['breakGlassLogs'],
    queryFn: () => base44.entities.BreakGlassLog.list('-started_at', 10),
  });

  const isLoading = loadingProfile || loadingExports || loadingAudits || loadingReleases || loadingBreakGlass;

  // Check 1: DeploymentProfile exists
  const profileExists = !!deploymentProfile;

  // Check 2: country_code is set
  const countryCodeSet = deploymentProfile && !!deploymentProfile.country_code;

  // Check 3: storage bucket ref is set
  const storageBucketSet = deploymentProfile && !!deploymentProfile.storage_bucket_ref;

  // Check 4: encryption key ref is set
  const encryptionKeySet = deploymentProfile && !!deploymentProfile.encryption_key_ref;

  // Check 5: no cross-organization exports
  const organizations = [...new Set(exportBundles.map(b => b.organization_id).filter(Boolean))];
  const noCrossOrgExports = organizations.length <= 1 || exportBundles.length === 0;

  // Check 6: audit logging enabled (check if audit logs are being created)
  const auditLoggingEnabled = auditLogs.length > 0;
  const lastAuditLog = auditLogs[0];

  // Check 7: portal result gating enabled (check if ReleaseToPatient records exist)
  const portalGatingEnabled = releaseQueue.length > 0;
  const lastRelease = releaseQueue[0];

  // Check 8: break-glass logging enabled
  const breakGlassEnabled = breakGlassLogs.length > 0;
  const lastBreakGlass = breakGlassLogs[0];

  const checks = [
    {
      name: 'Deployment Profile Exists',
      status: profileExists,
      detail: profileExists ? `Profile ID: ${deploymentProfile.id}` : 'No deployment profile found',
      timestamp: profileExists ? deploymentProfile.created_date : null,
      critical: true
    },
    {
      name: 'Country Code Set',
      status: countryCodeSet,
      detail: countryCodeSet ? `Country: ${deploymentProfile.country_name} (${deploymentProfile.country_code})` : 'Country code not configured',
      timestamp: null,
      critical: true
    },
    {
      name: 'Storage Bucket Configured',
      status: storageBucketSet,
      detail: storageBucketSet ? `Bucket: ${deploymentProfile.storage_bucket_ref}` : 'Storage bucket not configured',
      timestamp: null,
      critical: true
    },
    {
      name: 'Encryption Key Configured',
      status: encryptionKeySet,
      detail: encryptionKeySet ? `Key: ${deploymentProfile.encryption_key_ref}` : 'Encryption key not configured',
      timestamp: null,
      critical: true
    },
    {
      name: 'No Cross-Organization Exports',
      status: noCrossOrgExports,
      detail: noCrossOrgExports 
        ? 'All exports are organization-scoped' 
        : `Warning: ${organizations.length} organizations with exports detected`,
      timestamp: null,
      critical: false
    },
    {
      name: 'Audit Logging Active',
      status: auditLoggingEnabled,
      detail: auditLoggingEnabled 
        ? `${auditLogs.length} recent audit logs found` 
        : 'No audit logs detected',
      timestamp: lastAuditLog?.timestamp,
      critical: true
    },
    {
      name: 'Portal Result Gating Enabled',
      status: portalGatingEnabled,
      detail: portalGatingEnabled 
        ? `${releaseQueue.length} recent releases found` 
        : 'No release records detected',
      timestamp: lastRelease?.created_date,
      critical: false
    },
    {
      name: 'Break-Glass Logging Enabled',
      status: breakGlassEnabled,
      detail: breakGlassEnabled 
        ? `${breakGlassLogs.length} break-glass logs found` 
        : 'No break-glass logs detected (may be normal if not used)',
      timestamp: lastBreakGlass?.started_at,
      critical: false
    }
  ];

  const passedChecks = checks.filter(c => c.status).length;
  const totalChecks = checks.length;
  const criticalChecks = checks.filter(c => c.critical);
  const criticalPassed = criticalChecks.filter(c => c.status).length;
  const allCriticalPassed = criticalPassed === criticalChecks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Deployment Compliance Checklist</h1>
        <p className="text-slate-500 mt-1">Validate deployment configuration and security settings</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={allCriticalPassed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Overall Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {allCriticalPassed ? (
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-rose-600" />
                  )}
                  <div>
                    <p className={`text-2xl font-bold ${allCriticalPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {allCriticalPassed ? 'Compliant' : 'Non-Compliant'}
                    </p>
                    <p className="text-sm text-slate-600">{passedChecks}/{totalChecks} checks passed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Critical Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{criticalPassed}/{criticalChecks.length}</p>
                <p className="text-sm text-slate-600 mt-1">Must all pass</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Deployment Info</CardTitle>
              </CardHeader>
              <CardContent>
                {deploymentProfile ? (
                  <>
                    <p className="text-lg font-semibold text-slate-900">{deploymentProfile.country_name}</p>
                    <p className="text-sm text-slate-600">{deploymentProfile.country_code}</p>
                    <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700">Read-Only</Badge>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No profile configured</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compliance Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checks.map((check, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-white">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {check.status ? (
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-rose-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900">{check.name}</p>
                          {check.critical && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Critical
                            </Badge>
                          )}
                          <Badge variant="outline" className={check.status ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>
                            {check.status ? 'Pass' : 'Fail'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{check.detail}</p>
                        {check.timestamp && (
                          <p className="text-xs text-slate-500 mt-1">
                            Last activity: {format(new Date(check.timestamp), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {!allCriticalPassed && (
            <Card className="bg-rose-50 border-rose-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-rose-900">Action Required</p>
                    <p className="text-sm text-rose-700 mt-1">
                      One or more critical compliance checks have failed. Please review and address the issues immediately.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}