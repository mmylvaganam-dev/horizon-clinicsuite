import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Beaker, Settings, Plus, Edit, Trash2, WifiOff, 
  Book, AlertTriangle, CheckCircle, RefreshCw, Link
} from 'lucide-react';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import AnalyzerForm from '@/components/lis/AnalyzerForm';
import AnalyzerConnectionGuide from '@/components/lis/AnalyzerConnectionGuide';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  chemistry: 'bg-amber-100 text-amber-700',
  hematology: 'bg-red-100 text-red-700',
  immunoassay: 'bg-purple-100 text-purple-700',
  microbiology: 'bg-green-100 text-green-700',
  molecular: 'bg-blue-100 text-blue-700',
  other: 'bg-slate-100 text-slate-700',
};

const STATUS_ICONS = {
  active: <CheckCircle className="w-4 h-4 text-green-600" />,
  maintenance: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  inactive: <WifiOff className="w-4 h-4 text-slate-400" />,
};

export default function LISAdmin() {
  const queryClient = useQueryClient();
  const { orgFilter, withOrgId, selectedOrgId } = useOrgFiltered();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAnalyzer, setEditingAnalyzer] = useState(null);
  const [guideAnalyzer, setGuideAnalyzer] = useState(null);

  const { data: analyzers = [], isLoading } = useQuery({
    queryKey: ['analyzers', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerRegistry.filter(orgFilter),
    enabled: !!selectedOrgId,
    refetchInterval: 30000,
  });

  const { data: inboxStats = [] } = useQuery({
    queryKey: ['analyzerInboxStats', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerInbox.filter(orgFilter, '-received_at', 200),
    enabled: !!selectedOrgId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnalyzerRegistry.create(withOrgId(data)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['analyzers'] }); setFormOpen(false); toast.success('Analyzer added'); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnalyzerRegistry.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['analyzers'] }); setFormOpen(false); setEditingAnalyzer(null); toast.success('Analyzer updated'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnalyzerRegistry.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['analyzers'] }); toast.success('Analyzer removed'); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (data) => {
    if (editingAnalyzer) updateMutation.mutate({ id: editingAnalyzer.id, data });
    else createMutation.mutate(data);
  };

  const getInboxCount = (analyzerId) => inboxStats.filter(m => m.analyzer_id === analyzerId).length;
  const getPendingCount = (analyzerId) => inboxStats.filter(m => m.analyzer_id === analyzerId && ['pending', 'parsed', 'matched'].includes(m.status)).length;

  const totalMessages = inboxStats.length;
  const pendingMessages = inboxStats.filter(m => ['pending', 'parsed', 'matched'].includes(m.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LIS Administration</h1>
        <p className="text-slate-500 mt-1">Analyzer hardware integration, test catalog, and system configuration</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Analyzers', value: analyzers.length, color: 'text-teal-600' },
          { label: 'Active', value: analyzers.filter(a => a.status === 'active').length, color: 'text-green-600' },
          { label: 'Inbox Messages', value: totalMessages, color: 'text-blue-600' },
          { label: 'Pending Review', value: pendingMessages, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="analyzers">
        <TabsList>
          <TabsTrigger value="analyzers">Analyzer Registry</TabsTrigger>
          <TabsTrigger value="catalog">Test Catalog</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="analyzers" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{analyzers.length} analyzer{analyzers.length !== 1 ? 's' : ''} registered</p>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => { setEditingAnalyzer(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Analyzer
            </Button>
          </div>

          {isLoading ? (
            <p className="text-center text-slate-400 py-10">Loading analyzers...</p>
          ) : analyzers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Beaker className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No analyzers registered yet</p>
                <p className="text-sm text-slate-400 mt-1">Add your first analyzer to enable auto result ingestion</p>
                <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => { setEditingAnalyzer(null); setFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Add First Analyzer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {analyzers.map(analyzer => {
                const pending = getPendingCount(analyzer.id);
                const total = getInboxCount(analyzer.id);
                return (
                  <Card key={analyzer.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                          <Beaker className="w-6 h-6 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900">{analyzer.analyzer_name}</p>
                            {STATUS_ICONS[analyzer.status]}
                            <Badge className={TYPE_COLORS[analyzer.analyzer_type] || 'bg-slate-100 text-slate-700'}>
                              {analyzer.analyzer_type}
                            </Badge>
                            <Badge variant="outline" className="uppercase text-xs">{analyzer.interface_type}</Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {analyzer.manufacturer}{analyzer.serial_number ? ` · S/N: ${analyzer.serial_number}` : ''}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span>{total} messages received</span>
                            {pending > 0 && <span className="text-amber-600 font-medium">{pending} pending review</span>}
                            {analyzer.next_maintenance && <span>Next maint: {analyzer.next_maintenance}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="text-teal-600 border-teal-200" onClick={() => setGuideAnalyzer(analyzer)}>
                            <Link className="w-4 h-4 mr-1" /> Connect
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingAnalyzer(analyzer); setFormOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-700"
                            onClick={() => { if (confirm(`Remove ${analyzer.analyzer_name}?`)) deleteMutation.mutate(analyzer.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalog" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Test Catalog', desc: 'Manage individual lab tests and panels', icon: Book },
              { title: 'Reference Ranges', desc: 'Configure normal ranges by age/sex/test', icon: Settings },
              { title: 'Critical Value Rules', desc: 'Define thresholds that trigger critical alerts', icon: AlertTriangle },
              { title: 'Result Templates', desc: 'PDF report layouts and branding', icon: Book },
            ].map(item => (
              <Card key={item.title} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Auto-Apply Rules', desc: 'When matched, auto-apply results without manual review', icon: CheckCircle },
              { title: 'Critical Notifications', desc: 'Alert clinicians when critical values detected', icon: AlertTriangle },
              { title: 'Retry Settings', desc: 'Configure retry logic for failed message processing', icon: RefreshCw },
              { title: 'Interface Logs', desc: 'View raw message processing logs for troubleshooting', icon: Settings },
            ].map(item => (
              <Card key={item.title} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AnalyzerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        analyzer={editingAnalyzer}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AnalyzerConnectionGuide
        open={!!guideAnalyzer}
        onOpenChange={(o) => !o && setGuideAnalyzer(null)}
        analyzer={guideAnalyzer}
      />
    </div>
  );
}