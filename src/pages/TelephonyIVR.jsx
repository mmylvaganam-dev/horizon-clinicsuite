import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import TelephonyModuleGate from '@/components/telephony/TelephonyModuleGate';
import IVRForm from '@/components/telephony/IVRForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, Plus, Pencil, Trash2 } from 'lucide-react';

export default function TelephonyIVR() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: ivrs, isLoading } = useQuery({
    queryKey: ['telephonyIVRs', selectedOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyIVRs', { action: 'list', org_id: selectedOrgId });
      return res.data.items || [];
    },
    enabled: !!selectedOrgId,
  });

  const { data: queues = [] } = useQuery({
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
      await base44.functions.invoke('telephonyIVRs', {
        action, org_id: selectedOrgId, id: editing?.id, payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['telephonyIVRs', selectedOrgId]);
      setDialogOpen(false); setEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.functions.invoke('telephonyIVRs', { action: 'delete', org_id: selectedOrgId, id }),
    onSuccess: () => queryClient.invalidateQueries(['telephonyIVRs', selectedOrgId])
  });

  return (
    <TelephonyModuleGate>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">IVR Menus</h1>
              <p className="text-sm text-slate-500">Configure automated attendant digit menus</p>
            </div>
          </div>
          <Button onClick={() => { setEditing({}); setDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" /> Add IVR
          </Button>
        </div>

        {isLoading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>}

        {!isLoading && (ivrs || []).length === 0 && (
          <Card><CardContent className="flex flex-col items-center py-12 text-center">
            <GitBranch className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No IVR menus configured</p>
            <p className="text-slate-400 text-sm">Add an IVR menu to greet callers and route them via keypresses.</p>
          </CardContent></Card>
        )}

        <div className="space-y-3">
          {(ivrs || []).map(ivr => {
            const menuEntries = Object.entries(ivr.menu_json || {});
            return (
              <Card key={ivr.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-slate-900">{ivr.name}</p>
                        {!ivr.is_active && <Badge className="bg-red-100 text-red-700 text-xs">Inactive</Badge>}
                        <Badge className="bg-amber-100 text-amber-700 text-xs">{menuEntries.length} digit{menuEntries.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      {menuEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {menuEntries.sort().map(([digit, dest]) => (
                            <span key={digit} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              Press {digit} → {dest.label || dest.type}
                            </span>
                          ))}
                        </div>
                      )}
                      {ivr.greeting_file_pointer && (
                        <p className="text-xs text-slate-400 mt-1.5">🔊 Greeting attached</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(ivr); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ivr.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit IVR Menu' : 'New IVR Menu'}</DialogTitle>
            </DialogHeader>
            <IVRForm
              initial={editing || {}}
              queues={queues.filter(q => q.is_active)}
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