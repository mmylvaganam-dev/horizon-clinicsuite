import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const runTypeColors = {
  nightly: 'from-blue-500 to-blue-600',
  weekly: 'from-purple-500 to-purple-600',
  monthly: 'from-teal-500 to-teal-600',
  manual: 'from-amber-500 to-amber-600',
};

const statusColors = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  fail: 'bg-rose-100 text-rose-700 border-rose-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function AdminBackups() {
  const { data: backupLogs = [], isLoading } = useQuery({
    queryKey: ['backupRunLogs'],
    queryFn: () => base44.entities.BackupRunLog.list('-started_at'),
  });

  const { data: deploymentProfile } = useQuery({
    queryKey: ['deploymentProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.DeploymentProfile.list();
      return profiles[0] || null;
    },
  });

  const getLastSuccessfulBackup = (runType) => {
    const successful = backupLogs.filter(log => log.run_type === runType && log.status === 'success');
    return successful.length > 0 ? successful[0] : null;
  };

  const lastNightly = getLastSuccessfulBackup('nightly');
  const lastWeekly = getLastSuccessfulBackup('weekly');
  const lastMonthly = getLastSuccessfulBackup('monthly');

  const recentBackups = backupLogs.slice(0, 10);
  const failedBackups = backupLogs.filter(log => log.status === 'fail');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Backup Management</h1>
        <p className="text-slate-500 mt-1">Monitor backup operations and status</p>
      </div>

      {deploymentProfile && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Deployment:</span> {deploymentProfile.country_code} ({deploymentProfile.country_name})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last Nightly Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastNightly ? (
              <div>
                <p className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Success
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {formatDistanceToNow(new Date(lastNightly.completed_at || lastNightly.started_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(lastNightly.completed_at || lastNightly.started_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <AlertTriangle className="w-6 h-6" />
                <span>No backups yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last Weekly Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastWeekly ? (
              <div>
                <p className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Success
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {formatDistanceToNow(new Date(lastWeekly.completed_at || lastWeekly.started_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(lastWeekly.completed_at || lastWeekly.started_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <AlertTriangle className="w-6 h-6" />
                <span>No backups yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last Monthly Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastMonthly ? (
              <div>
                <p className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Success
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {formatDistanceToNow(new Date(lastMonthly.completed_at || lastMonthly.started_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(lastMonthly.completed_at || lastMonthly.started_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <AlertTriangle className="w-6 h-6" />
                <span>No backups yet</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {failedBackups.length > 0 && (
        <Card className="bg-rose-50 border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-900 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Failed Backups: {failedBackups.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rose-700">
              There are {failedBackups.length} failed backup(s) that require attention
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Backup Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : recentBackups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No backup operations logged</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBackups.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border bg-white">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${runTypeColors[log.run_type]} flex items-center justify-center flex-shrink-0`}>
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {log.run_type}
                      </Badge>
                      <Badge variant="outline" className={`${statusColors[log.status]} border`}>
                        {log.status}
                      </Badge>
                      {log.deployment_country_code && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {log.deployment_country_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      Started: {format(new Date(log.started_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {log.completed_at && (
                      <p className="text-sm text-slate-600">
                        Completed: {format(new Date(log.completed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {log.backup_ref && (
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        Ref: {log.backup_ref}
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}