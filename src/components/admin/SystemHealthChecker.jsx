import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  Database, 
  Users, 
  Shield, 
  Mail, 
  MessageSquare,
  Settings,
  FileText,
  DollarSign,
  Heart,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SystemHealthChecker({ organizationId }) {
  const [results, setResults] = useState(null);

  const runHealthCheck = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('runSystemHealthCheck', { organizationId });
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data);
    }
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Database': Database,
      'Entities': FileText,
      'Users': Users,
      'Access Control': Shield,
      'Communications': MessageSquare,
      'Configuration': Settings,
      'Clinical': Heart,
      'Finance': DollarSign,
      'Security': Shield
    };
    const Icon = icons[category] || Activity;
    return <Icon className="w-5 h-5" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'from-green-500 to-emerald-600';
      case 'warning':
        return 'from-yellow-500 to-orange-600';
      case 'critical':
        return 'from-red-500 to-rose-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  if (!organizationId) {
    return (
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
        <p className="text-yellow-900 font-bold">⚠️ Please select an organization first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Run Health Check Button */}
      <div className="flex items-center justify-center">
        <Button
          onClick={() => runHealthCheck.mutate()}
          disabled={runHealthCheck.isPending}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-2xl transform hover:scale-105 transition-all"
        >
          {runHealthCheck.isPending ? (
            <>
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              Running System Health Check...
            </>
          ) : (
            <>
              <Activity className="w-6 h-6 mr-3" />
              🔍 Run Complete System Health Check
            </>
          )}
        </Button>
      </div>

      {/* Results Display */}
      {results && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className={`border-4 bg-gradient-to-br ${getStatusColor(results.status)} text-white shadow-2xl`}>
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <Heart className="w-10 h-10" />
                System Health Score: {results.healthScore}%
              </CardTitle>
              <p className="text-white/90 text-lg">
                {results.status === 'healthy' ? '✅ All systems operational' : 
                 results.status === 'warning' ? '⚠️ Some issues detected' : 
                 '❌ Critical issues require attention'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <p className="text-white/80 text-sm">Passed</p>
                  <p className="text-4xl font-bold">{results.summary.passed}</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <p className="text-white/80 text-sm">Warnings</p>
                  <p className="text-4xl font-bold">{results.summary.warnings}</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <p className="text-white/80 text-sm">Failed</p>
                  <p className="text-4xl font-bold">{results.summary.failed}</p>
                </div>
              </div>
              <div className="mt-4 bg-white/30 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${results.healthScore}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Detailed Test Results */}
          <Card className="border-2 border-slate-200">
            <CardHeader>
              <CardTitle className="text-2xl">Detailed Test Results</CardTitle>
              <p className="text-slate-600">Individual test status for all system components</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.tests.map((test, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      test.status === 'passed' ? 'bg-green-50 border-green-300' :
                      test.status === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                      'bg-red-50 border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(test.category)}
                        <div>
                          <p className="font-bold text-slate-900">{test.category} → {test.test}</p>
                          <p className="text-sm text-slate-700">{test.message}</p>
                          {test.count !== undefined && (
                            <p className="text-xs text-slate-600 mt-1">Records: {test.count}</p>
                          )}
                        </div>
                      </div>
                      {getStatusIcon(test.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {results.summary.failed > 0 && (
            <Card className="border-4 border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 text-2xl flex items-center gap-2">
                  <AlertTriangle className="w-7 h-7" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.tests
                    .filter(t => t.status === 'failed')
                    .map((test, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-red-900">{test.test}</p>
                          <p className="text-sm text-red-800">{test.message}</p>
                        </div>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Export Report Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => {
                const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `health-check-${new Date().toISOString()}.json`;
                a.click();
              }}
              variant="outline"
              className="border-2 border-blue-500 text-blue-700 hover:bg-blue-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Full Report (JSON)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}