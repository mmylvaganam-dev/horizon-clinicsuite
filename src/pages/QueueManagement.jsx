import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Settings, Monitor, Users, BarChart3, RefreshCw, PhoneCall, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import CounterSetupForm from '../components/queue/CounterSetupForm';
import AddTokenDialog from '../components/queue/AddTokenDialog';
import TokenCard from '../components/queue/TokenCard';
import QueueHowToGuide from '../components/queue/QueueHowToGuide';
import { createPageUrl } from '../utils';

const counterTypeIcon = {
  opd: '🏥', lab: '🧪', pharmacy: '💊', doctor: '👨‍⚕️',
  consultation: '🩺', registration: '📋', radiology: '📷', other: '🏢',
};

export default function QueueManagement() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [counterFormOpen, setCounterFormOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [addTokenCounter, setAddTokenCounter] = useState(null);
  const [activeTab, setActiveTab] = useState('live');

  const { data: counters = [], isLoading: loadingCounters } = useQuery({
    queryKey: ['queueCounters', selectedOrgId],
    queryFn: () => base44.entities.QueueCounter.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: todayTokens = [] } = useQuery({
    queryKey: ['queueTokens', selectedOrgId, today],
    queryFn: async () => {
      const allTokens = [];
      for (const ctr of counters) {
        const tokens = await base44.entities.QueueToken.filter({ counter_id: ctr.id, session_date: today });
        allTokens.push(...tokens);
      }
      return allTokens;
    },
    enabled: counters.length > 0,
    refetchInterval: 10000,
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.QueueToken.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['queueTokens'] });
    });
    return unsub;
  }, [queryClient]);

  const updateToken = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QueueToken.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queueTokens'] }),
  });

  const handleTokenAction = (token, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'called') updates.called_at = new Date().toISOString();
    if (newStatus === 'serving') updates.served_at = new Date().toISOString();
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    if (newStatus === 'waiting') { updates.called_at = null; } // recall
    updateToken.mutate({ id: token.id, data: updates });
  };

  const getCounterTokens = (counterId, statuses) =>
    todayTokens
      .filter(t => t.counter_id === counterId && statuses.includes(t.status))
      .sort((a, b) => a.token_seq - b.token_seq);

  // Stats
  const totalWaiting = todayTokens.filter(t => t.status === 'waiting').length;
  const totalServed = todayTokens.filter(t => t.status === 'completed').length;
  const totalCalled = todayTokens.filter(t => t.status === 'called' || t.status === 'serving').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Queue Management</h1>
          <p className="text-slate-500 mt-1">{format(new Date(), 'EEEE, MMMM d yyyy')} · Real-time queue control</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['queueTokens'] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => window.open(`${window.location.origin}${createPageUrl('QueueDisplay')}?org=${selectedOrgId}`, '_blank')}>
            <Monitor className="w-4 h-4 mr-2" /> Display Board
          </Button>
          <Button onClick={() => { setEditingCounter(null); setCounterFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Counter
          </Button>
        </div>
      </div>

      {/* How-to guide */}
      <QueueHowToGuide />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Waiting</p>
          <p className="text-3xl font-bold text-blue-600">{totalWaiting}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Being Served</p>
          <p className="text-3xl font-bold text-amber-600">{totalCalled}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Completed Today</p>
          <p className="text-3xl font-bold text-emerald-600">{totalServed}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="live"><PhoneCall className="w-4 h-4 mr-2" />Live Queue</TabsTrigger>
          <TabsTrigger value="counters"><Settings className="w-4 h-4 mr-2" />Counters</TabsTrigger>
          <TabsTrigger value="history"><BarChart3 className="w-4 h-4 mr-2" />Today's Log</TabsTrigger>
        </TabsList>

        {/* Live Queue Tab */}
        <TabsContent value="live" className="mt-4">
          {counters.filter(c => c.status !== 'inactive').length === 0 ? (
            <Card className="p-12 text-center border-0 shadow-sm">
              <PhoneCall className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No active counters</h3>
              <p className="text-slate-500 mb-4">Add your first queue counter to get started</p>
              <Button onClick={() => setCounterFormOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Counter</Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {counters.filter(c => c.status !== 'inactive').map(counter => {
                const waiting = getCounterTokens(counter.id, ['waiting']);
                const active = getCounterTokens(counter.id, ['called', 'serving']);
                const skipped = getCounterTokens(counter.id, ['skipped']);

                return (
                  <Card key={counter.id} className="border-0 shadow-sm overflow-hidden">
                    {/* Counter Header */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{counterTypeIcon[counter.counter_type] || '🏢'}</span>
                        <div>
                          <h3 className="font-bold">{counter.name}</h3>
                          <p className="text-teal-200 text-sm">{counter.prefix}xxx tokens · {waiting.length} waiting</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {counter.status === 'paused' && <Badge className="bg-amber-400 text-amber-900">Paused</Badge>}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                          onClick={() => setAddTokenCounter(counter)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Issue Token
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                          onClick={() => window.open(`${window.location.origin}${createPageUrl('QueueDisplay')}?org=${selectedOrgId}&counter=${counter.id}`, '_blank')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Active */}
                      <div>
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Now Serving / Called</p>
                        {active.length === 0 ? (
                          <p className="text-slate-400 text-sm italic">No active token</p>
                        ) : (
                          active.map(t => (
                            <TokenCard
                              key={t.id}
                              token={t}
                              onServe={() => handleTokenAction(t, 'serving')}
                              onComplete={() => handleTokenAction(t, 'completed')}
                              onSkip={() => handleTokenAction(t, 'skipped')}
                            />
                          ))
                        )}
                      </div>

                      {/* Waiting */}
                      <div>
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Waiting Queue ({waiting.length})</p>
                        {waiting.length === 0 ? (
                          <p className="text-slate-400 text-sm italic">Queue is empty</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {waiting.map(t => (
                              <TokenCard
                                key={t.id}
                                token={t}
                                onCall={() => handleTokenAction(t, 'called')}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Skipped */}
                      <div>
                        <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">Skipped / No Show ({skipped.length})</p>
                        {skipped.length === 0 ? (
                          <p className="text-slate-400 text-sm italic">None</p>
                        ) : (
                          <div className="space-y-2">
                            {skipped.map(t => (
                              <TokenCard
                                key={t.id}
                                token={t}
                                onRecall={() => handleTokenAction(t, 'waiting')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Counters Setup Tab */}
        <TabsContent value="counters" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {counters.map(ctr => (
              <Card key={ctr.id} className="p-5 border-0 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{counterTypeIcon[ctr.counter_type] || '🏢'}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{ctr.name}</h3>
                      <p className="text-xs text-slate-500">{ctr.code} · Prefix: <strong>{ctr.prefix}</strong></p>
                    </div>
                  </div>
                  <Badge className={ctr.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ctr.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}>
                    {ctr.status}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingCounter(ctr); setCounterFormOpen(true); }}>
                    <Settings className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setAddTokenCounter(ctr)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Token
                  </Button>
                </div>
              </Card>
            ))}
            <button
              onClick={() => { setEditingCounter(null); setCounterFormOpen(true); }}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-colors"
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm font-medium">Add Counter</span>
            </button>
          </div>
        </TabsContent>

        {/* Today's Log Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-slate-900">All Tokens Today — {format(new Date(), 'MMMM d, yyyy')}</h3>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {todayTokens.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No tokens issued today</p>
                </div>
              ) : (
                todayTokens.sort((a, b) => (b.token_seq || 0) - (a.token_seq || 0)).map(token => {
                  const counter = counters.find(c => c.id === token.counter_id);
                  const statusColors = {
                    waiting: 'bg-blue-100 text-blue-700',
                    called: 'bg-amber-100 text-amber-700',
                    serving: 'bg-teal-100 text-teal-700',
                    completed: 'bg-emerald-100 text-emerald-700',
                    skipped: 'bg-rose-100 text-rose-700',
                    no_show: 'bg-red-100 text-red-700',
                  };
                  return (
                    <div key={token.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-slate-800 text-lg w-16">{token.token_number}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{token.patient_name}</p>
                          <p className="text-xs text-slate-400">{counter?.name} · {token.patient_mobile || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {token.priority !== 'normal' && (
                          <span className="text-xs">{token.priority === 'urgent' ? '🔴' : '🟡'}</span>
                        )}
                        <Badge className={statusColors[token.status] || 'bg-slate-100'}>
                          {token.status?.replace('_', ' ')}
                        </Badge>
                        {token.completed_at && (
                          <span className="text-xs text-slate-400">{format(new Date(token.completed_at), 'HH:mm')}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {counterFormOpen && (
        <CounterSetupForm
          open={counterFormOpen}
          onOpenChange={setCounterFormOpen}
          counter={editingCounter}
          organizationId={selectedOrgId}
          onSaved={() => {
            setCounterFormOpen(false);
            setEditingCounter(null);
            queryClient.invalidateQueries({ queryKey: ['queueCounters'] });
          }}
        />
      )}

      {addTokenCounter && (
        <AddTokenDialog
          open={!!addTokenCounter}
          onOpenChange={(v) => { if (!v) setAddTokenCounter(null); }}
          counter={addTokenCounter}
          onTokenAdded={() => {
            setAddTokenCounter(null);
            queryClient.invalidateQueries({ queryKey: ['queueTokens'] });
          }}
        />
      )}
    </div>
  );
}