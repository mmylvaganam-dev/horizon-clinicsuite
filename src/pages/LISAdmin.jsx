import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Beaker, Settings } from 'lucide-react';

export default function LISAdmin() {
  const { data: analyzers = [] } = useQuery({
    queryKey: ['analyzers'],
    queryFn: () => base44.entities.AnalyzerRegistry.list(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LIS Administration</h1>
        <p className="text-slate-500 mt-1">Test catalog, analyzers, and system configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="w-5 h-5" />
              Analyzer Registry
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyzers.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No analyzers configured</p>
            ) : (
              <div className="space-y-2">
                {analyzers.map(analyzer => (
                  <div key={analyzer.id} className="p-4 rounded-lg border bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{analyzer.analyzer_name}</p>
                        <p className="text-sm text-slate-500 capitalize">{analyzer.analyzer_type}</p>
                        <p className="text-xs text-slate-400">S/N: {analyzer.serial_number}</p>
                      </div>
                      <Badge variant={analyzer.status === 'active' ? 'default' : 'secondary'}>
                        {analyzer.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-slate-50">
                <p className="font-medium text-slate-900">Test Catalog</p>
                <p className="text-sm text-slate-600">Manage lab tests and panels</p>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50">
                <p className="font-medium text-slate-900">Reference Ranges</p>
                <p className="text-sm text-slate-600">Configure normal ranges by test</p>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50">
                <p className="font-medium text-slate-900">Critical Value Rules</p>
                <p className="text-sm text-slate-600">Define critical thresholds</p>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50">
                <p className="font-medium text-slate-900">Result Templates</p>
                <p className="text-sm text-slate-600">PDF report templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}