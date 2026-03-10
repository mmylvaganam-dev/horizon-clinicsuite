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
import { Plus, Trash2, ChevronUp, ChevronDown, Clock, ListVideo, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LOCATION_TYPES = ['waiting_room', 'reception', 'hallway', 'exam_room'];

export default function SignagePlaylists() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [plOpen, setPlOpen] = useState(false);
  const [editingPl, setEditingPl] = useState(null);
  const [plForm, setPlForm] = useState({ name: '', clinic_name: '', location_type: 'waiting_room', is_default: false, transition_seconds: 10 });
  const [addItemId, setAddItemId] = useState('');

  const { data: playlists = [] } = useQuery({ queryKey: ['signagePlaylists'], queryFn: () => base44.entities.Playlist.list() });
  const { data: playlistItems = [] } = useQuery({ queryKey: ['playlistItems'], queryFn: () => base44.entities.PlaylistItem.list() });
  const { data: signageItems = [] } = useQuery({ queryKey: ['signageItems'], queryFn: () => base44.entities.SignageItem.list() });

  const selected = playlists.find(p => p.id === selectedId);
  const currentItems = playlistItems.filter(pi => pi.playlist_id === selectedId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const upsertPl = useMutation({
    mutationFn: d => editingPl ? base44.entities.Playlist.update(editingPl.id, d) : base44.entities.Playlist.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['signagePlaylists'] });
      if (!editingPl) setSelectedId(res.id);
      setPlOpen(false);
      toast.success(editingPl ? 'Playlist updated' : 'Playlist created');
    }
  });
  const deletePl = useMutation({
    mutationFn: id => base44.entities.Playlist.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['signagePlaylists'] }); setSelectedId(null); }
  });
  const addItem = useMutation({
    mutationFn: ({ playlist_id, signage_item_id }) => base44.entities.PlaylistItem.create({ playlist_id, signage_item_id, display_seconds: 10, sort_order: currentItems.length }),
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
    const idx = currentItems.indexOf(pi);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= currentItems.length) return;
    const other = currentItems[swapIdx];
    updateItem.mutate({ id: pi.id, sort_order: swapIdx });
    updateItem.mutate({ id: other.id, sort_order: idx });
  };

  const openCreatePl = () => { setEditingPl(null); setPlForm({ name: '', clinic_name: '', location_type: 'waiting_room', is_default: false, transition_seconds: 10 }); setPlOpen(true); };
  const openEditPl = pl => { setEditingPl(pl); setPlForm({ name: pl.name, clinic_name: pl.clinic_name || '', location_type: pl.location_type || 'waiting_room', is_default: pl.is_default || false, transition_seconds: pl.transition_seconds || 10 }); setPlOpen(true); };

  const assignedItemIds = new Set(currentItems.map(ci => ci.signage_item_id));
  const availableItems = signageItems.filter(si => !assignedItemIds.has(si.id) && si.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Playlists</h1>
          <p className="text-slate-500 text-sm">Build and manage content playlists for your screens</p>
        </div>
        <Button onClick={openCreatePl} className="gap-2"><Plus className="w-4 h-4" /> New Playlist</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist list */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Playlists ({playlists.length})</p>
          {playlists.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">No playlists yet</p>}
          {playlists.map(pl => (
            <Card key={pl.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedId === pl.id ? 'border-teal-500 shadow-md bg-teal-50' : ''}`} onClick={() => setSelectedId(pl.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{pl.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{pl.location_type?.replace(/_/g, ' ')} · {pl.clinic_name || 'All clinics'}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <ListVideo className="w-3 h-3" /> {playlistItems.filter(pi => pi.playlist_id === pl.id).length} items
                      {pl.is_default && <Badge className="ml-2 bg-teal-600 text-white text-xs">Default</Badge>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEditPl(pl); }}><Edit2 className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={e => { e.stopPropagation(); if (confirm('Delete playlist?')) deletePl.mutate(pl.id); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Playlist items editor */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card><CardContent className="p-12 text-center text-slate-400">Select a playlist to manage its items</CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{selected.name}</span>
                  <span className="text-sm font-normal text-slate-500">{currentItems.length} items · {currentItems.reduce((sum, i) => sum + (i.display_seconds || 10), 0)}s total</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Add item */}
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
                        <Badge className="text-xs bg-slate-200 text-slate-600 mt-0.5">{si.type}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <Input
                          type="number"
                          value={pi.display_seconds || 10}
                          onChange={e => updateItem.mutate({ id: pi.id, display_seconds: parseInt(e.target.value) || 10 })}
                          className="w-16 h-7 text-xs text-center"
                          min={3}
                          max={300}
                        />
                        <span>s</span>
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveItem(pi, -1)} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveItem(pi, 1)} disabled={idx === currentItems.length - 1}><ChevronDown className="w-3 h-3" /></Button>
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