import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TestTube, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  TrendingUp,
  Beaker
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';

export default function LISDashboard() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();

  const { data: orders = [] } = useQuery({
    queryKey: ['labOrders', selectedOrgId],
    queryFn: () => base44.entities.Order.filter({ order_type: 'LAB', ...orgFilter }),
    enabled: !!selectedOrgId,
  });

  const { data: specimens = [] } = useQuery({
    queryKey: ['specimens', selectedOrgId],
    queryFn: () => base44.entities.Specimen.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['labResults', selectedOrgId],
    queryFn: () => base44.entities.Result.filter({ result_type: 'LAB', ...orgFilter }),
    enabled: !!selectedOrgId,
  });

  const { data: analyzerInbox = [] } = useQuery({
    queryKey: ['analyzerInbox', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerInbox.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const { data: qcLogs = [] } = useQuery({
    queryKey: ['qcLogs', selectedOrgId],
    queryFn: () => base44.entities.QCLog.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const { data: analyzers = [] } = useQuery({
    queryKey: ['analyzers', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerRegistry.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const pendingAccession = orders.filter(o => o.status === 'Submitted' || o.status === 'Draft').length;
  const collectedSpecimens = specimens.filter(s => s.status === 'collected').length;
  const pendingReview = results.filter(r => r.status === 'Entered').length;
  const criticalPending = results.filter(r => r.is_critical && !r.acknowledged_at).length;
  const pendingMessages = analyzerInbox.filter(m => m.status === 'pending').length;
  const qcDueToday = qcLogs.filter(q => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return q.scheduled_date === today && q.status === 'scheduled';
  }).length;
  const failedQC = qcLogs.filter(q => q.result === 'fail').length;
  const activeAnalyzers = analyzers.filter(a => a.status === 'active').length;

  const stats = [
    {
      title: 'Pending Accession',
      value: pendingAccession,
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      link: 'LISOrders'
    },
    {
      title: 'Collected Specimens',
      value: collectedSpecimens,
      icon: TestTube,
      color: 'from-purple-500 to-purple-600',
      link: 'LISSpecimens'
    },
    {
      title: 'Pending Review',
      value: pendingReview,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      link: 'LISResults'
    },
    {
      title: 'Critical Alerts',
      value: criticalPending,
      icon: AlertTriangle,
      color: 'from-rose-500 to-rose-600',
      link: 'CriticalQueue'
    },
    {
      title: 'Analyzer Messages',
      value: pendingMessages,
      icon: Activity,
      color: 'from-teal-500 to-teal-600',
      link: 'LISAnalyzerInbox'
    },
    {
      title: 'QC Due Today',
      value: qcDueToday,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      link: 'LISQC'
    },
    {
      title: 'Failed QC',
      value: failedQC,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      link: 'LISQC'
    },
    {
      title: 'Active Analyzers',
      value: activeAnalyzers,
      icon: Beaker,
      color: 'from-indigo-500 to-indigo-600',
      link: 'LISAdmin'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LIS Dashboard</h1>
        <p className="text-slate-500 mt-1">Laboratory Information System overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} to={createPageUrl(stat.link)}>
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-0 overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${stat.color}`} />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.slice(0, 5).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No recent orders</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Order #{order.order_number || order.id.slice(0, 8)}</p>
                        <p className="text-sm text-slate-500">
                          {order.test_name || 'Lab Tests'}
                        </p>
                      </div>
                      <Badge variant={order.status === 'Completed' ? 'default' : 'secondary'}>
                        {order.status}
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
              <Beaker className="w-5 h-5" />
              Analyzer Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyzers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No analyzers configured</p>
            ) : (
              <div className="space-y-2">
                {analyzers.map(analyzer => (
                  <div key={analyzer.id} className="p-3 rounded-lg border bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{analyzer.analyzer_name}</p>
                        <p className="text-sm text-slate-500">{analyzer.analyzer_type}</p>
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
      </div>

      <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Quick Actions</h3>
              <p className="text-teal-100 text-sm">Common LIS workflows</p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl('LISOrders')}>
                <Button variant="secondary" size="sm">Accession Order</Button>
              </Link>
              <Link to={createPageUrl('LISResults')}>
                <Button variant="secondary" size="sm">Enter Results</Button>
              </Link>
              <Link to={createPageUrl('LISAnalyzerInbox')}>
                <Button variant="secondary" size="sm">Analyzer Inbox</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}