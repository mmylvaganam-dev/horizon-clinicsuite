import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, Wrench } from 'lucide-react';
import { format } from 'date-fns';

export default function LISQC() {
  const { data: qcLogs = [] } = useQuery({
    queryKey: ['qcLogs'],
    queryFn: () => base44.entities.QCLog.list(),
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ['maintenanceLogs'],
    queryFn: () => base44.entities.MaintenanceLog.list(),
  });

  const { data: analyzers = [] } = useQuery({
    queryKey: ['analyzers'],
    queryFn: () => base44.entities.AnalyzerRegistry.list(),
  });

  const passedQC = qcLogs.filter(q => q.result === 'pass');
  const failedQC = qcLogs.filter(q => q.result === 'fail');
  const overdueMaintenance = maintenanceLogs.filter(m => m.status === 'overdue');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">QC & Maintenance</h1>
        <p className="text-slate-500 mt-1">Quality control and analyzer maintenance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Passed QC</p>
                <p className="text-3xl font-bold text-slate-900">{passedQC.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Failed QC</p>
                <p className="text-3xl font-bold text-slate-900">{failedQC.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overdue Maintenance</p>
                <p className="text-3xl font-bold text-slate-900">{overdueMaintenance.length}</p>
              </div>
              <Wrench className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="qc">
        <TabsList>
          <TabsTrigger value="qc">QC Logs</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="qc">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {qcLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No QC logs yet</p>
              ) : (
                <div className="space-y-2">
                  {qcLogs.map(log => {
                    const analyzer = analyzers.find(a => a.id === log.analyzer_id);
                    return (
                      <div key={log.id} className="p-4 rounded-lg border bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-slate-900">
                                {analyzer?.analyzer_name || 'Unknown Analyzer'}
                              </p>
                              <Badge variant="outline">{log.test_code}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-1">
                              Type: {log.qc_type} • Expected: {log.expected_value} • Measured: {log.measured_value}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(log.qc_date), 'MMM d, yyyy h:mm a')} by {log.performed_by_email}
                            </p>
                          </div>
                          <Badge className={log.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}>
                            {log.result}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {maintenanceLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No maintenance logs yet</p>
              ) : (
                <div className="space-y-2">
                  {maintenanceLogs.map(log => {
                    const analyzer = analyzers.find(a => a.id === log.analyzer_id);
                    return (
                      <div key={log.id} className="p-4 rounded-lg border bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-slate-900">
                                {analyzer?.analyzer_name || 'Unknown Analyzer'}
                              </p>
                              <Badge variant="outline" className="capitalize">{log.maintenance_type}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-1">{log.description}</p>
                            <p className="text-xs text-slate-500">
                              Scheduled: {format(new Date(log.scheduled_date), 'MMM d, yyyy')}
                              {log.performed_date && ` • Completed: ${format(new Date(log.performed_date), 'MMM d, yyyy')}`}
                            </p>
                          </div>
                          <Badge variant={log.status === 'completed' ? 'default' : log.status === 'overdue' ? 'destructive' : 'secondary'}>
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}