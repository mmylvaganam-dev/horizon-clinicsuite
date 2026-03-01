import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  PhoneCall, Plus, Trash2, Save, Phone, Users, ChevronRight,
  Settings, Hash, ArrowRight, Edit2, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const DIGIT_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-teal-100 text-teal-800 border-teal-200',
];

const DEST_ICONS = { queue: Users, extension: Phone, ivr: Settings };
const DEST_LABELS = { queue: 'Queue', extension: 'Extension', ivr: 'IVR Menu' };

const DEFAULT_IVR = {
  name: '',
  menu_json: {},
  greeting_file_pointer: '',
  is_active: true,
};

export default function IVRFlowBuilder({ orgId }) {
  const queryClient = useQueryClient();
  const [editingIVR, setEditingIVR] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [addDigit, setAddDigit] = useState('');
  const [addDestType, setAddDestType] = useState('queue');
  const [addLabel, setAddLabel] = useState('');

  const { data: ivrs = [], isLoading } = useQuery({
    queryKey: ['ivrs', orgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyIVRs', { action: 'list', org_id: orgId });
      return res.data.items || [];
    },
    enabled: !!orgId,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues', orgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyQueues', { action: 'list', org_id: orgId });
      return res.data.items || [];
    },
    enabled: !!orgId,
  });

  const { data: extensions = [] } = useQuery({
    queryKey: ['extensions', orgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyExtensions', { action: 'list', org_id: orgId });
      return res.data.items || [];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async (ivrData) => {
      const action = ivrData.id ? 'update' : 'create';
      const res = await base44.functions.invoke('telephonyIVRs', {
        action, org_id: orgId, ivr: ivrData
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ivrs', orgId]);
      toast.success('IVR saved!');
      setShowBuilder(false);
      setEditingIVR(null);
    },
    onError: (e) => toast.error('Save failed: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('telephonyIVRs', { action: 'delete', org_id: orgId, ivr_id: id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ivrs', orgId]);
      toast.success('IVR deleted');
    },
  });

  const openNew = () => {
    setEditingIVR({ ...DEFAULT_IVR, menu_json: {} });
    setShowBuilder(true);
  };

  const openEdit = (ivr) => {
    setEditingIVR({ ...ivr, menu_json: { ...(ivr.menu_json || {}) } });
    setShowBuilder(true);
  };

  const addMenuItem = () => {
    if (!addDigit || !addLabel) return;
    setEditingIVR(prev => ({
      ...prev,
      menu_json: {
        ...prev.menu_json,
        [addDigit]: { type: addDestType, label: addLabel, id: '' }
      }
    }));
    setAddDigit('');
    setAddLabel('');
    setAddDestType('queue');
  };

  const removeMenuItem = (digit) => {
    setEditingIVR(prev => {
      const updated = { ...prev.menu_json };
      delete updated[digit];
      return { ...prev, menu_json: updated };
    });
  };

  const updateMenuItemId = (digit, id) => {
    setEditingIVR(prev => ({
      ...prev,
      menu_json: {
        ...prev.menu_json,
        [digit]: { ...prev.menu_json[digit], id }
      }
    }));
  };

  const digits = editingIVR ? Object.keys(editingIVR.menu_json || {}).sort() : [];

  return (
    <Card className="border-2 border-teal-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-teal-600" />
            IVR Flow Builder
          </CardTitle>
          <Button size="sm" onClick={openNew} className="bg-teal-600 hover:bg-teal-700 h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> New IVR Menu
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}</div>
        )}

        {!isLoading && ivrs.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No IVR menus yet. Create one to route inbound calls.</p>
          </div>
        )}

        <div className="space-y-3">
          {ivrs.map((ivr) => {
            const menuEntries = Object.entries(ivr.menu_json || {}).sort(([a], [b]) => a.localeCompare(b));
            return (
              <div key={ivr.id} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* IVR header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{ivr.name}</p>
                      <p className="text-xs text-slate-500">{menuEntries.length} menu option{menuEntries.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={ivr.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                      {ivr.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ivr)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(ivr.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Visual flow */}
                {menuEntries.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Caller entry point */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 border-2 border-blue-200">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium">
                        IVR Menu
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <div className="flex flex-wrap gap-2">
                        {menuEntries.map(([digit, dest], idx) => {
                          const Icon = DEST_ICONS[dest.type] || Phone;
                          const colorClass = DIGIT_COLORS[idx % DIGIT_COLORS.length];
                          return (
                            <div key={digit} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${colorClass}`}>
                              <Hash className="w-3 h-3" />
                              <span className="font-bold">{digit}</span>
                              <ChevronRight className="w-3 h-3 opacity-50" />
                              <Icon className="w-3 h-3" />
                              <span>{dest.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={(o) => { if (!o) { setShowBuilder(false); setEditingIVR(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-600" />
              {editingIVR?.id ? 'Edit IVR Menu' : 'New IVR Menu'}
            </DialogTitle>
          </DialogHeader>

          {editingIVR && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <Label>Menu Name</Label>
                <Input
                  placeholder="e.g. Main Auto-Attendant"
                  value={editingIVR.name}
                  onChange={e => setEditingIVR(p => ({ ...p, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Greeting */}
              <div>
                <Label>Greeting Audio URL <span className="text-xs text-slate-400">(optional)</span></Label>
                <Input
                  placeholder="https://... or file URL"
                  value={editingIVR.greeting_file_pointer || ''}
                  onChange={e => setEditingIVR(p => ({ ...p, greeting_file_pointer: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Visual flow preview */}
              {digits.length > 0 && (
                <div>
                  <Label className="block mb-2">Call Flow Preview</Label>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 border-2 border-blue-200">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium">
                        {editingIVR.name || 'IVR Menu'}
                      </div>
                      {digits.length > 0 && <ArrowRight className="w-4 h-4 text-slate-300" />}
                      <div className="flex flex-wrap gap-2">
                        {digits.map((digit, idx) => {
                          const dest = editingIVR.menu_json[digit];
                          const Icon = DEST_ICONS[dest.type] || Phone;
                          const colorClass = DIGIT_COLORS[idx % DIGIT_COLORS.length];
                          return (
                            <div key={digit} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${colorClass}`}>
                              <Hash className="w-3 h-3" /><span className="font-bold">{digit}</span>
                              <ChevronRight className="w-3 h-3 opacity-50" />
                              <Icon className="w-3 h-3" /><span>{dest.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu entries */}
              <div>
                <Label className="block mb-2">Menu Options</Label>
                <div className="space-y-2 mb-3">
                  {digits.map((digit, idx) => {
                    const dest = editingIVR.menu_json[digit];
                    const destOptions = dest.type === 'queue' ? queues : dest.type === 'extension' ? extensions : ivrs;
                    return (
                      <div key={digit} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${DIGIT_COLORS[idx % DIGIT_COLORS.length]}`}>
                          {digit}
                        </div>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <Badge variant="outline" className="text-xs capitalize">{dest.type}</Badge>
                        <span className="text-sm text-slate-700 flex-1 font-medium">{dest.label}</span>
                        {destOptions.length > 0 && (
                          <Select value={dest.id || ''} onValueChange={(v) => updateMenuItemId(digit, v)}>
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue placeholder="Link to…" />
                            </SelectTrigger>
                            <SelectContent>
                              {destOptions.map(opt => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.name || opt.display_name || opt.extension_number || opt.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => removeMenuItem(digit)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Add digit */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Input
                    placeholder="Digit (e.g. 1)"
                    value={addDigit}
                    onChange={e => setAddDigit(e.target.value.replace(/[^0-9*#]/g, '').slice(0, 1))}
                    className="w-20 text-center font-mono"
                  />
                  <Select value={addDestType} onValueChange={setAddDestType}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="queue">Queue</SelectItem>
                      <SelectItem value="extension">Extension</SelectItem>
                      <SelectItem value="ivr">IVR Menu</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Label (e.g. Reception)"
                    value={addLabel}
                    onChange={e => setAddLabel(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={addMenuItem} disabled={!addDigit || !addLabel}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="ivr-active"
                  checked={editingIVR.is_active}
                  onChange={e => setEditingIVR(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="ivr-active" className="cursor-pointer">Active (live on the PBX)</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setShowBuilder(false); setEditingIVR(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(editingIVR)}
                  disabled={saveMutation.isPending || !editingIVR.name}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saveMutation.isPending ? 'Saving…' : 'Save IVR Menu'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}