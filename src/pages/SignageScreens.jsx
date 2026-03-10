import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Monitor, Plus, Edit2, Copy, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';

const LOCATION_TYPES = ['waiting_room', 'reception', 'hallway', 'exam_room'];
const STATUS_COLORS = { active: 'bg-green-100 text-green-800', inactive: 'bg-slate-100 text-slate-600', offline: 'bg-red-100 text-red-700' };
const genKey = () => 'SCR-' + Math.random().toString(36).substr(2, 8).toUpperCase();

export default function SignageScreens() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: '', clinic_name: '', location_type: 'waiting_room', screen_key: '', status: 'active', assigned_playlist_id: '' };
  const [form, setForm] = useState(emptyForm);

  const { data: screens = [], isLoading } = useQuery({ queryKey: ['clinicScreens'], queryFn: () => base44.entities.ClinicScreen.list() });
  const { data: playlists = [] } = useQuery({ queryKey: ['signagePlaylists'], queryFn: () => base44.entities.Playlist.list() });

  const upsert = useMutation({
    mutationFn: d => editing ? base44.entities.ClinicScreen.update(editing.id, d) : base44.entities.ClinicScreen.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinicScreens'] }); setOpen(false); toast.success(editing ? 'Screen updated' : 'Screen created'); }
  });
  const remove = useMutation({
    mutationFn: id => base44.entities.ClinicScreen.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinicScreens'] }); toast.success('Screen deleted'); }
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, screen_key: genKey() }); setOpen(true); };
  const openEdit = s => { setEditing(s); setForm({ name: s.name, clinic_name: s.clinic_name || '', location_type: s.location_type || 'waiting_room', screen_key: s.screen_key, status: s.status || 'active', assigned_playlist_id: s.assigned_playlist_id || '' }); setOpen(true); };

  const getPlayerUrl = key => {
    const base = createPageUrl('SignagePlayer');
    return window.location.origin + window.location.pathname + (base.includes('?') ? base.split('?')[0] + '?' + base.split('?')[1] + '&screenKey=' + key : '?page=SignagePlayer&screenKey=' + key);
  };

  const filtered = screens.filter(s => {
    const ms = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.clinic_name?.toLowerCase().includes(search.toLowerCase());
    const ml = filterLoc === 'all' || s.location_type === filterLoc;
    return ms && ml;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screens</h1>
          <p className="text-slate-500 text-sm">Manage clinic TV displays and player URLs</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Screen</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search screens..." value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
        <Select value={filterLoc} onValueChange={setFilterLoc}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {LOCATION_TYPES.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-center py-16 text-slate-400">Loading...</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(screen => (
            <Card key={screen.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{screen.name}</p>
                      <p className="text-xs text-slate-500">{screen.clinic_name}</p>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[screen.status] || STATUS_COLORS.inactive}>{screen.status}</Badge>
                </div>

                <div className="space-y-1 text-xs text-slate-600 mb-4">
                  <div className="flex justify-between"><span className="text-slate-400">Location</span><span className="capitalize">{screen.location_type?.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Screen Key</span><span className="font-mono">{screen.screen_key}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Playlist</span><span>{playlists.find(p => p.id === screen.assigned_playlist_id)?.name || 'None'}</span></div>
                  {screen.last_seen_at && (
                    <div className="flex justify-between"><span className="text-slate-400">Last seen</span><span>{formatDistanceToNow(new Date(screen.last_seen_at), { addSuffix: true })}</span></div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(screen)} className="gap-1"><Edit2 className="w-3 h-3" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(getPlayerUrl(screen.screen_key)); toast.success('Player URL copied!'); }} className="gap-1"><Copy className="w-3 h-3" /> Copy URL</Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(getPlayerUrl(screen.screen_key), '_blank')} className="gap-1"><ExternalLink className="w-3 h-3" /> Open</Button>
                  <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 gap-1" onClick={() => { if (confirm('Delete this screen?')) remove.mutate(screen.id); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="col-span-3 text-center py-16 text-slate-400">No screens found.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Screen' : 'Add Screen'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Screen Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Waiting Room TV 1" /></div>
            <div><Label>Clinic Name</Label><Input value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} /></div>
            <div>
              <Label>Location Type</Label>
              <Select value={form.location_type} onValueChange={v => setForm({ ...form, location_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOCATION_TYPES.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Screen Key *</Label>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setForm({ ...form, screen_key: genKey() })}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                </Button>
              </div>
              <Input value={form.screen_key} onChange={e => setForm({ ...form, screen_key: e.target.value })} className="font-mono" />
            </div>
            <div>
              <Label>Assign Playlist</Label>
              <Select value={form.assigned_playlist_id || '__none__'} onValueChange={v => setForm({ ...form, assigned_playlist_id: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(form)} disabled={!form.name || !form.screen_key || upsert.isPending}>
                {upsert.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}