import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import TelephonyModuleGate from '@/components/telephony/TelephonyModuleGate';
import QueueForm from '@/components/telephony/QueueForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';

const STRATEGY_COLORS = {
  ring_all: 'bg-green-100 text-green-700',
  hunt: 'bg-blue-100 text-blue-700',
  round_robin: 'bg-orange-100 text-orange-700',
};

const STRATEGY_LABELS = {
  ring_all: 'Ring All',
  hunt: 'Hunt',
  round_robin: 'Round Robin',
};

export default function TelephonyQueues() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: queues, isLoading } = useQuery({
    queryKey: ['telephonyQueues', selectedOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyQueues', { action: 'list', org_id: selectedOrgId });
      return res.data.items || [];
    },
    enabled: !!selectedOrgId,
  });

  const { data: extensions = [] } = useQuery({
    queryKey: ['telephonyExtensions', selectedOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyExtensions', { action: 'list', org_id: selectedOrgId });
      return res.data.items || [];
    },
    enabled: !!selectedOrgId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const action = editing?.id ? 'update' : 'create';
      await base44.functions.invoke('telephonyQueues', {
        action, org_id: selectedOrgId, id: editing?.id, payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['telephonyQueues', selectedOrgId]);
      setDialogOpen(false); setEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.functions.invoke('telephonyQueues', { action: 'delete', org_id: selectedOrgId, id }),
    onSuccess: () => queryClient.invalidateQueries(['telephonyQueues', selectedOrgId])
  });

  const getExtName = (id) => {
    const ext = extensions.find(e => e.id === id);
    return ext ? `${ext.extension_number} · ${ext.display_name}` : id;
  };

  return (
    <TelephonyModuleGate>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Call Queues</h1>
              <p className="text-sm text-slate-500">Manage inbound call queues and ring strategies</p>
            </div>
          </div>
          <Button onClick={() => { setEditing({}); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Queue
          </Button>
        </div>

        {isLoading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>}

        {!isLoading && (queues || []).length === 0 && (
          <Card><CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No queues configured</p>
            <p className="text-slate-400 text-sm">Add a queue to route inbound calls to groups of extensions.</p>
          </CardContent></Card>
        )}

        <div className="space-y-3">
          {(queues || []).map(q => (
            <Card key={q.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-slate-900">{q.name}</p>
                      <Badge className={`text-xs ${STRATEGY_COLORS[q.strategy] || 'bg-slate-100 text-slate-700'}`}>
                        {STRATEGY_LABELS[q.strategy] || q.strategy}
                      </Badge>
                      {!q.is_active && <Badge className="bg-red-100 text-red-700 text-xs">Inactive</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(q.members || []).map(memberId => (
                        <span key={memberId} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {getExtName(memberId)}
                        </span>
                      ))}
                      {(!q.members || q.members.length === 0) && (
                        <span className="text-xs text-slate-400">No members assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(q); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(q.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit Queue' : 'New Call Queue'}</DialogTitle>
            </DialogHeader>
            <QueueForm
              initial={editing || {}}
              extensions={extensions.filter(e => e.is_active)}
              onSave={(payload) => saveMutation.mutate(payload)}
              onCancel={() => setDialogOpen(false)}
              isSaving={saveMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </TelephonyModuleGate>
  );
}