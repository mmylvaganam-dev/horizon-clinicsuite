import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, Search, RefreshCw, CheckCircle, XCircle, 
  AlertTriangle, Eye, Wifi, Clock, Filter
} from 'lucide-react';
import { formatSL } from '@/components/utils/dateUtils';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import InboxMessageDetail from '@/components/lis/InboxMessageDetail';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-700',
  parsed: 'bg-blue-100 text-blue-700',
  matched: 'bg-purple-100 text-purple-700',
  applied: 'bg-green-100 text-green-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const STATUS_ICONS = {
  pending: <Clock className="w-3 h-3" />,
  parsed: <Activity className="w-3 h-3" />,
  matched: <CheckCircle className="w-3 h-3" />,
  applied: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

export default function LISAnalyzerInbox() {
  const queryClient = useQueryClient();
  const { orgFilter, withOrgId, selectedOrgId } = useOrgFiltered();
  const [statusFilter, setStatusFilter] = useState('all');
  const [analyzerFilter, setAnalyzerFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['analyzerInbox', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerInbox.filter(orgFilter, '-received_at', 200),
    enabled: !!selectedOrgId,
    refetchInterval: 15000,
  });

  const { data: analyzers = [] } = useQuery({
    queryKey: ['analyzers', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerRegistry.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedOrgId) return;
    const unsub = base44.entities.AnalyzerInbox.subscribe((event) => {
      if (event.data?.organization_id === selectedOrgId) {
        queryClient.invalidateQueries({ queryKey: ['analyzerInbox'] });
        if (event.type === 'create') {
          const a = analyzers.find(x => x.id === event.data?.analyzer_id);
          toast.success(`New result from ${a?.analyzer_name || 'analyzer'}`, { icon: '🔬' });
        }
      }
    });
    return unsub;
  }, [selectedOrgId, analyzers]);

  const applyMutation = useMutation({
    mutationFn: async (messageId) => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) throw new Error('Message not found');
      if (!msg.specimen_id) throw new Error('No specimen matched — cannot auto-apply');

      const specimens = await base44.entities.Specimen.filter({ id: msg.specimen_id });
      const specimen = specimens[0];
      if (!specimen) throw new Error('Specimen record not found');

      const parsed = msg.parsed_data || {};
      const params = parsed.parameters || [];
      const isCritical = params.some(p => ['C', 'H', 'L'].includes(p.abnormal_flag));

      const result = await base44.entities.Result.create(withOrgId({
        order_id: specimen.order_id || '',
        patient_id: specimen.patient_id,
        result_type: 'LAB',
        test_name: parsed.test_name || 'Lab Result',
        accession_number: parsed.specimen_id || '',
        specimen_type: specimen.specimen_type || '',
        result_date: new Date().toISOString(),
        structured_json: { parameters: params, analyzer_id: msg.analyzer_id },
        status: 'Entered',
        is_critical: isCritical,
        entered_by: `analyzer:${msg.analyzer_id}`,
      }));

      await base44.entities.AnalyzerInbox.update(messageId, {
        status: 'applied',
        result_id: result.id,
        processed_at: new Date().toISOString(),
        processed_by: 'manual_apply',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyzerInbox', 'labResults'] });
      setSelectedMessage(null);
      toast.success('Result applied to patient record');
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (messageId) => base44.entities.AnalyzerInbox.update(messageId, {
      status: 'rejected',
      rejection_reason: 'Manually rejected by lab technician',
      processed_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyzerInbox'] });
      setSelectedMessage(null);
      toast.success('Message rejected');
    },
  });

  const filtered = messages.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (analyzerFilter !== 'all' && m.analyzer_id !== analyzerFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const parsed = m.parsed_data || {};
      if (!parsed.specimen_id?.toLowerCase().includes(term) &&
          !parsed.test_name?.toLowerCase().includes(term) &&
          !m.message_type?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const counts = {
    pending: messages.filter(m => m.status === 'pending').length,
    parsed: messages.filter(m => m.status === 'parsed').length,
    matched: messages.filter(m => m.status === 'matched').length,
    applied: messages.filter(m => m.status === 'applied').length,
    rejected: messages.filter(m => m.status === 'rejected').length,
  };
  const actionRequired = counts.pending + counts.parsed + counts.matched;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analyzer Inbox</h1>
          <p className="text-slate-500 mt-1">Real-time hardware integration — auto-ingested results from connected analyzers</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Wifi className="w-4 h-4 text-green-500" />
          <span>Live — refreshes every 15s</span>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${statusFilter === status ? 'ring-2 ring-teal-500' : ''}`}
          >
            <p className={`text-xl font-bold ${count > 0 && ['pending','parsed','matched'].includes(status) ? 'text-amber-600' : 'text-slate-800'}`}>{count}</p>
            <p className="text-xs text-slate-500 capitalize mt-0.5 flex items-center gap-1">
              {STATUS_ICONS[status]}
              {status}
            </p>
          </button>
        ))}
      </div>

      {actionRequired > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{actionRequired} message{actionRequired !== 1 ? 's' : ''}</strong> require lab technician review before results are applied to patient records.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by specimen ID, test name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={analyzerFilter} onValueChange={setAnalyzerFilter}>
          <SelectTrigger className="w-52">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All analyzers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Analyzers</SelectItem>
            {analyzers.map(a => <SelectItem key={a.id} value={a.id}>{a.analyzer_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['pending','parsed','matched','applied','rejected'].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Message list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-teal-600" />
            {filtered.length} Message{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-slate-400 py-10">Loading inbox...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-10 h-10 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">No messages match your filters</p>
              <p className="text-sm text-slate-400 mt-1">Connect an analyzer via LIS Administration → Analyzer Registry</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(message => {
                const analyzer = analyzers.find(a => a.id === message.analyzer_id);
                const parsed = message.parsed_data || {};
                const params = parsed.parameters || [];
                const criticalParams = params.filter(p => ['H', 'L', 'C'].includes(p.abnormal_flag));
                const isActionable = ['parsed', 'matched'].includes(message.status);

                return (
                  <div
                    key={message.id}
                    className={`p-4 rounded-xl border bg-white hover:shadow-md transition-all cursor-pointer ${isActionable ? 'border-amber-200 bg-amber-50/30' : ''}`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-slate-900 text-sm">
                            {analyzer?.analyzer_name || 'Unknown Analyzer'}
                          </p>
                          <Badge variant="outline" className="text-xs uppercase">{message.message_type}</Badge>
                          {parsed.test_name && <span className="text-xs text-slate-500">{parsed.test_name}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            {parsed.specimen_id
                              ? `Specimen: ${parsed.specimen_id}`
                              : <span className="text-amber-600">No specimen matched</span>}
                          </span>
                          <span>{params.length} parameter{params.length !== 1 ? 's' : ''}</span>
                          {criticalParams.length > 0 && (
                            <span className="text-rose-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {criticalParams.length} abnormal
                            </span>
                          )}
                          <span className="text-slate-400">
                            {formatSL(new Date(message.received_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`${STATUS_COLORS[message.status]} flex items-center gap-1`}>
                          {STATUS_ICONS[message.status]}
                          {message.status}
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>

                    {params.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {params.slice(0, 5).map((p, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${p.abnormal_flag ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            {p.name || p.code}: {p.value} {p.unit}
                            {p.abnormal_flag && ` (${p.abnormal_flag})`}
                          </span>
                        ))}
                        {params.length > 5 && <span className="text-xs text-slate-400">+{params.length - 5} more</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <InboxMessageDetail
        open={!!selectedMessage}
        onOpenChange={(o) => !o && setSelectedMessage(null)}
        message={selectedMessage}
        analyzerName={analyzers.find(a => a.id === selectedMessage?.analyzer_id)?.analyzer_name}
        onApply={(id) => applyMutation.mutate(id)}
        onReject={(id) => rejectMutation.mutate(id)}
        isApplying={applyMutation.isPending}
      />
    </div>
  );
}