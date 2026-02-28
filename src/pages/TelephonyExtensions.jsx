import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import TelephonyModuleGate from '@/components/telephony/TelephonyModuleGate';
import ExtensionForm from '@/components/telephony/ExtensionForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Plus, Pencil, Trash2, UserCircle } from 'lucide-react';

const ROLE_COLORS = {
  reception: 'bg-blue-100 text-blue-700',
  nurse: 'bg-teal-100 text-teal-700',
  doctor: 'bg-purple-100 text-purple-700',
  billing: 'bg-orange-100 text-orange-700',
  admin: 'bg-slate-100 text-slate-700',
};

export default function TelephonyExtensions() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
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
      await base44.functions.invoke('telephonyExtensions', {
        action, org_id: selectedOrgId, id: editing?.id, payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['telephonyExtensions', selectedOrgId]);
      setDialogOpen(false);
      setEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.functions.invoke('telephonyExtensions', { action: 'delete', org_id: selectedOrgId, id });
    },
    onSuccess: () => queryClient.invalidateQueries(['telephonyExtensions', selectedOrgId])
  });

  const openNew = () => { setEditing({}); setDialogOpen(true); };
  const openEdit = (ext) => { setEditing(ext); setDialogOpen(true); };

  return (
    <TelephonyModuleGate>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Extensions</h1>
              <p className="text-sm text-slate-500">Manage softphone extensions for this organization</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-2" /> Add Extension
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        )}

        {!isLoading && (data || []).length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <UserCircle className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No extensions yet</p>
              <p className="text-slate-400 text-sm">Click "Add Extension" to create the first one.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {(data || []).map(ext => (
            <Card key={ext.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-violet-700 text-lg">{ext.extension_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{ext.display_name}</p>
                    {ext.role_tag && (
                      <Badge className={`capitalize text-xs ${ROLE_COLORS[ext.role_tag] || 'bg-slate-100 text-slate-700'}`}>
                        {ext.role_tag}
                      </Badge>
                    )}
                    {!ext.is_active && <Badge className="bg-red-100 text-red-700 text-xs">Inactive</Badge>}
                  </div>
                  <div className="flex gap-4 mt-0.5">
                    {ext.email && <p className="text-xs text-slate-500">{ext.email}</p>}
                    {ext.mobile && <p className="text-xs text-slate-500">{ext.mobile}</p>}
                    {ext.pbx_extension_id && <p className="text-xs text-slate-400">PBX: {ext.pbx_extension_id}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(ext)}>
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ext.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit Extension' : 'New Extension'}</DialogTitle>
            </DialogHeader>
            <ExtensionForm
              initial={editing || {}}
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