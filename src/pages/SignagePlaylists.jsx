import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronUp, ChevronDown, Clock, ListVideo, Edit2, Eye, GraduationCap, Monitor, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import SignageTVPreview from '../components/signage/SignageTVPreview';

const LOCATION_TYPES = ['waiting_room', 'reception', 'hallway', 'exam_room', 'pharmacy'];

export default function SignagePlaylists() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [plOpen, setPlOpen] = useState(false);
  const [editingPl, setEditingPl] = useState(null);
  const [plForm, setPlForm] = useState({ name: '', clinic_name: '', location_type: 'waiting_room', is_default: false, transition_seconds: 10, health_edu_mode: false });
  const [addItemId, setAddItemId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: playlists = [] } = useQuery({ queryKey: ['signagePlaylists'], queryFn: () => base44.entities.Playlist.list() });
  const { data: playlistItems = [] } = useQuery({ queryKey: ['playlistItems'], queryFn: () => base44.entities.PlaylistItem.list() });
  const { data: signageItems = [] } = useQuery({ queryKey: ['signageItems'], queryFn: () => base44.entities.SignageItem.list() });
  const { data: screens = [] } = useQuery({ queryKey: ['clinicScreens'], queryFn: () => base44.entities.ClinicScreen.list() });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const selected = playlists.find(p => p.id === selectedId);
  const allCurrentItems = playlistItems.filter(pi => pi.playlist_id === selectedId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // If health edu mode, filter to only education items
  const currentItems = selected?.health_edu_mode
    ? allCurrentItems.filter(pi => {
        const si = signageItems.find(s => s.id === pi.signage_item_id);
        return si?.is_health_education;
      })
    : allCurrentItems;

  const logAudit = async (action, pl, changes = '') => {
    await base44.entities.SignageAuditLog.create({
      entity_type: 'playlist', entity_id: pl.id || 'new', entity_name: pl.name,
      action, changed_by_email: user?.email || 'unknown', changes_summary: changes
    });
  };

  const upsertPl = useMutation({
    mutationFn: d => editingPl ? base44.entities.Playlist.update(editingPl.id, d) : base44.entities.Playlist.create(d),
    onSuccess: async (res, vars) => {
      await logAudit(editingPl ? 'updated' : 'created', { id: res?.id || editingPl?.id, name: vars.name }, editingPl ? 'Playlist settings updated' : 'New playlist created');
      qc.invalidateQueries({ queryKey: ['signagePlaylists'] });
      if (!editingPl) setSelectedId(res.id);
      setPlOpen(false);
      toast.success(editingPl ? 'Playlist updated' : 'Playlist created');
    }
  });

  const deletePl = useMutation({
    mutationFn: async (pl) => { await base44.entities.Playlist.delete(pl.id); return pl; },
    onSuccess: async (pl) => {
      await logAudit('deleted', pl, 'Playlist deleted');
      qc.invalidateQueries({ queryKey: ['signagePlaylists'] });
      setSelectedId(null);
    }
  });

  const addItem = useMutation({
    mutationFn: ({ playlist_id, signage_item_id }) => base44.entities.PlaylistItem.create({ playlist_id, signage_item_id, display_seconds: 10, sort_order: allCurrentItems.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playlistItems'] }); setAddItemId(''); toast.success('Item added'); }
  });

  const removeItem = useMutation({
    mutationFn: id => base44.entities.PlaylistItem.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlistItems'] })
  });

  const updateItem = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.PlaylistItem.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlistItems'] })
  });

  const moveItem = (pi, dir) => {
    const idx = allCurrentItems.indexOf(pi);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= allCurrentItems.length) return;
    const other = allCurrentItems[swapIdx];
    updateItem.mutate({ id: pi.id, sort_order: swapIdx });
    updateItem.mutate({ id: other.id, sort_order: idx });
  };

  const openCreatePl = () => { setEditingPl(null); setPlForm({ name: '', clinic_name: '', location_type: 'waiting_room', is_default: false, transition_seconds: 10, health_edu_mode: false }); setPlOpen(true); };
  const openEditPl = pl => {
    setEditingPl(pl);
    setPlForm({ name: pl.name, clinic_name: pl.clinic_name || '', location_type: pl.location_type || 'waiting_room', is_default: pl.is_default || false, transition_seconds: pl.transition_seconds || 10, health_edu_mode: pl.health_edu_mode || false });
    setPlOpen(true);
  };

  const assignedItemIds = new Set(allCurrentItems.map(ci => ci.signage_item_id));
  // Only approved/published items can be added to playlists
  const availableItems = signageItems.filter(si =>
    !assignedItemIds.has(si.id) && si.is_active &&
    (si.approval_status === 'approved' || si.approval_status === 'published')
  );

  const getPreviewItems = () => {
    return currentItems.map(pi => {
      const si = signageItems.find(s => s.id === pi.signage_item_id);
      return si ? { ...si, display_seconds: pi.display_seconds || 10 } : null;
    }).filter(Boolean);
  };

  // Analytics: screens per playlist
  const analyticsData = playlists.map(pl => ({
    ...pl,
    screenCount: screens.filter(s => s.assigned_playlist_id === pl.id).length,
    itemCount: playlistItems.filter(pi => pi.playlist_id === pl.id).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Playlists</h1>
          <p className="text-slate-500 text-sm">Build and manage content playlists for your screens</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)} className="gap-2">
            <BarChart3 className="w-4 h-4" /> Analytics
          </Button>
          <Button onClick={openCreatePl} className="gap-2"><Plus className="w-4 h-4" /> New Playlist</Button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" /> Playlist Analytics — Screens per Playlist</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {analyticsData.map(pl => (
                <div key={pl.id} className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900 text-sm">{pl.name}</p>
                    {pl.is_default && <Badge className="bg-teal-600 text-white text-xs">Default</Badge>}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Monitor className="w-4 h-4 text-teal-600" />
                      <span className="font-bold text-slate-900">{pl.screenCount}</span>
                      <span className="text-slate-500">screen{pl.screenCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ListVideo className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900">{pl.itemCount}</span>
                      <span className="text-slate-500">item{pl.itemCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {pl.health_edu_mode && (
                    <div className="mt-2"><Badge className="bg-green-100 text-green-700 gap-1"><GraduationCap className="w-3 h-3" /> Health Edu Mode</Badge></div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist list */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Playlists ({playlists.length})</p>
          {playlists.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">No playlists yet</p>}
          {playlists.map(pl => {
            const assignedScreens = screens.filter(s => s.assigned_playlist_id === pl.id).length;
            return (
              <Card key={pl.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedId === pl.id ? 'border-teal-500 shadow-md bg-teal-50' : ''}`} onClick={() => setSelectedId(pl.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{pl.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{pl.location_type?.replace(/_/g, ' ')} · {pl.clinic_name || 'All clinics'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1"><ListVideo className="w-3 h-3" /> {playlistItems.filter(pi => pi.playlist_id === pl.id).length} items</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Monitor className="w-3 h-3" /> {assignedScreens} screen{assignedScreens !== 1 ? 's' : ''}</span>
                        {pl.is_default && <Badge className="bg-teal-600 text-white text-xs">Default</Badge>}
                        {pl.health_edu_mode && <Badge className="bg-green-600 text-white text-xs gap-1"><GraduationCap className="w-3 h-3" /> Edu</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEditPl(pl); }}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={e => { e.stopPropagation(); if (confirm('Delete playlist?')) deletePl.mutate(pl); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Playlist items editor */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card><CardContent className="p-12 text-center text-slate-400">Select a playlist to manage its items</CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {selected.name}
                    {selected.health_edu_mode && <Badge className="bg-green-600 text-white gap-1 text-xs"><GraduationCap className="w-3 h-3" /> Health Edu Mode</Badge>}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-normal text-slate-500">{currentItems.length} items · {currentItems.reduce((sum, i) => sum + (i.display_seconds || 10), 0)}s total</span>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPreview(true)}>
                      <Eye className="w-3 h-3" /> Preview
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.health_edu_mode && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    <strong>Health Education Mode active</strong> — only items tagged as health education content will play. Add more education items from the Content Library.
                  </div>
                )}

                {/* Add item */}
                {!selected.health_edu_mode && (
                  <div className="flex gap-2">
                    <Select value={addItemId} onValueChange={setAddItemId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Add content item..." /></SelectTrigger>
                      <SelectContent>
                        {availableItems.map(si => <SelectItem key={si.id} value={si.id}>{si.title} ({si.type})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button disabled={!addItemId} onClick={() => addItem.mutate({ playlist_id: selectedId, signage_item_id: addItemId })} className="gap-1">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </div>
                )}

                {currentItems.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm">No items in this playlist yet</p>
                ) : currentItems.map((pi, idx) => {
                  const si = signageItems.find(s => s.id === pi.signage_item_id);
                  if (!si) return null;
                  return (
                    <div key={pi.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-sm font-mono w-5 text-center">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{si.title}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge className="text-xs bg-slate-200 text-slate-600">{si.type}</Badge>
                          {si.is_health_education && <Badge className="text-xs bg-green-100 text-green-700">edu</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <Input
                          type="number"
                          value={pi.display_seconds || 10}
                          onChange={e => updateItem.mutate({ id: pi.id, display_seconds: parseInt(e.target.value) || 10 })}
                          className="w-16 h-7 text-xs text-center"
                          min={3} max={300}
                        />
                        <span>s</span>
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveItem(pi, -1)} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveItem(pi, 1)} disabled={idx === allCurrentItems.length - 1}><ChevronDown className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => removeItem.mutate(pi.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showPreview && selected && (
        <SignageTVPreview items={getPreviewItems()} screen={screens.find(s => s.assigned_playlist_id === selected.id) || null} onClose={() => setShowPreview(false)} />
      )}

      <Dialog open={plOpen} onOpenChange={setPlOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingPl ? 'Edit Playlist' : 'New Playlist'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={plForm.name} onChange={e => setPlForm({ ...plForm, name: e.target.value })} /></div>
            <div><Label>Clinic Name</Label><Input value={plForm.clinic_name} onChange={e => setPlForm({ ...plForm, clinic_name: e.target.value })} /></div>
            <div>
              <Label>Location Type</Label>
              <Select value={plForm.location_type} onValueChange={v => setPlForm({ ...plForm, location_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOCATION_TYPES.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Default Slide Duration (seconds)</Label><Input type="number" value={plForm.transition_seconds} onChange={e => setPlForm({ ...plForm, transition_seconds: parseInt(e.target.value) || 10 })} min={3} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={plForm.is_default} onCheckedChange={v => setPlForm({ ...plForm, is_default: v })} />
              <Label>Default playlist for this location type</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={plForm.health_edu_mode} onCheckedChange={v => setPlForm({ ...plForm, health_edu_mode: v })} />
              <Label className="flex items-center gap-1"><GraduationCap className="w-4 h-4 text-green-600" /> Health Education Mode (only edu content)</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPlOpen(false)}>Cancel</Button>
              <Button onClick={() => upsertPl.mutate(plForm)} disabled={!plForm.name || upsertPl.isPending}>
                {upsertPl.isPending ? 'Saving...' : editingPl ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}