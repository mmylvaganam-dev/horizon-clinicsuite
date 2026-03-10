import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Monitor, Plus, Edit2, Copy, ExternalLink, RefreshCw, Trash2, Eye, Wifi, WifiOff, RotateCcw, SmartphoneIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';
import SignageTVPreview from '../components/signage/SignageTVPreview';

const LOCATION_TYPES = ['waiting_room', 'reception', 'hallway', 'exam_room', 'pharmacy'];
const THEMES = ['default', 'dark', 'light', 'warm', 'branded'];
const genKey = () => 'SCR-' + Math.random().toString(36).substr(2, 8).toUpperCase();

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function getHeartbeatStatus(screen) {
  if (!screen.last_seen_at) return 'never';
  const diff = Date.now() - new Date(screen.last_seen_at).getTime();
  return diff > OFFLINE_THRESHOLD_MS ? 'offline' : 'online';
}

export default function SignageScreens() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewScreen, setPreviewScreen] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);

  const emptyForm = {
    name: '', clinic_name: '', location_type: 'waiting_room', screen_key: '',
    status: 'active', assigned_playlist_id: '', orientation: 'landscape', theme: 'default',
    logo_url: '', ticker_enabled: false, ticker_text: '', queue_panel_enabled: false
  };
  const [form, setForm] = useState(emptyForm);

  const { data: screens = [], isLoading } = useQuery({ queryKey: ['clinicScreens'], queryFn: () => base44.entities.ClinicScreen.list() });
  const { data: playlists = [] } = useQuery({ queryKey: ['signagePlaylists'], queryFn: () => base44.entities.Playlist.list() });
  const { data: playlistItems = [] } = useQuery({ queryKey: ['playlistItems'], queryFn: () => base44.entities.PlaylistItem.list() });
  const { data: signageItems = [] } = useQuery({ queryKey: ['signageItems'], queryFn: () => base44.entities.SignageItem.list() });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const logAudit = async (action, screen, changes = '') => {
    await base44.entities.SignageAuditLog.create({
      entity_type: 'screen', entity_id: screen.id || 'new', entity_name: screen.name,
      action, changed_by_email: user?.email || 'unknown', changes_summary: changes
    });
  };

  const upsert = useMutation({
    mutationFn: d => editing ? base44.entities.ClinicScreen.update(editing.id, d) : base44.entities.ClinicScreen.create(d),
    onSuccess: async (res, vars) => {
      await logAudit(editing ? 'updated' : 'created', { id: res?.id || editing?.id, name: vars.name }, editing ? `Updated screen settings` : 'Created new screen');
      qc.invalidateQueries({ queryKey: ['clinicScreens'] });
      setOpen(false);
      toast.success(editing ? 'Screen updated' : 'Screen created');
    }
  });

  const remove = useMutation({
    mutationFn: async (screen) => {
      await base44.entities.ClinicScreen.delete(screen.id);
      return screen;
    },
    onSuccess: async (screen) => {
      await logAudit('deleted', screen, 'Screen deleted');
      qc.invalidateQueries({ queryKey: ['clinicScreens'] });
      toast.success('Screen deleted');
    }
  });

  const remoteRefresh = useMutation({
    mutationFn: (screen) => base44.entities.ClinicScreen.update(screen.id, { refresh_requested_at: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinicScreens'] }); toast.success('Refresh command sent to screen'); }
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, screen_key: genKey() }); setOpen(true); };
  const openEdit = s => {
    setEditing(s);
    setForm({
      name: s.name, clinic_name: s.clinic_name || '', location_type: s.location_type || 'waiting_room',
      screen_key: s.screen_key, status: s.status || 'active', assigned_playlist_id: s.assigned_playlist_id || '',
      orientation: s.orientation || 'landscape', theme: s.theme || 'default', logo_url: s.logo_url || '',
      ticker_enabled: s.ticker_enabled || false, ticker_text: s.ticker_text || '',
      queue_panel_enabled: s.queue_panel_enabled || false
    });
    setOpen(true);
  };

  const openPreview = (screen) => {
    const playlist = playlists.find(p => p.id === screen.assigned_playlist_id);
    if (!playlist) { toast('No playlist assigned to this screen'); return; }
    const pis = playlistItems.filter(pi => pi.playlist_id === screen.assigned_playlist_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const items = pis.map(pi => {
      const si = signageItems.find(s => s.id === pi.signage_item_id);
      return si ? { ...si, display_seconds: pi.display_seconds || 10 } : null;
    }).filter(Boolean);
    setPreviewItems(items);
    setPreviewScreen(screen);
  };

  const getPlayerUrl = key => {
    const base = createPageUrl('SignagePlayer');
    return window.location.origin + window.location.pathname + (base.includes('?') ? base.split('?')[0] + '?' + base.split('?')[1] + '&screenKey=' + key : '?page=SignagePlayer&screenKey=' + key);
  };

  const filtered = screens.filter(s => {
    const ms = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.clinic_name?.toLowerCase().includes(search.toLowerCase());
    const ml = filterLoc === 'all' || s.location_type === filterLoc;
    return ms && ml;
  });

  const getStatusBadge = (screen) => {
    const hb = getHeartbeatStatus(screen);
    if (hb === 'online') return <Badge className="bg-green-100 text-green-800 gap-1"><Wifi className="w-3 h-3" /> Online</Badge>;
    if (hb === 'offline') return <Badge className="bg-red-100 text-red-700 gap-1"><WifiOff className="w-3 h-3" /> Offline</Badge>;
    return <Badge className="bg-slate-100 text-slate-600">Never seen</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screens</h1>
          <p className="text-slate-500 text-sm">Manage clinic TV displays · heartbeat offline after 5 min of no contact</p>
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
                    <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center relative">
                      <Monitor className="w-5 h-5 text-teal-600" />
                      {screen.orientation === 'portrait' && <SmartphoneIcon className="w-3 h-3 text-blue-500 absolute -bottom-1 -right-1" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{screen.name}</p>
                      <p className="text-xs text-slate-500">{screen.clinic_name}</p>
                    </div>
                  </div>
                  {getStatusBadge(screen)}
                </div>

                <div className="space-y-1 text-xs text-slate-600 mb-3">
                  <div className="flex justify-between"><span className="text-slate-400">Location</span><span className="capitalize">{screen.location_type?.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Orientation</span><span className="capitalize">{screen.orientation || 'landscape'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Theme</span><span className="capitalize">{screen.theme || 'default'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Playlist</span><span>{playlists.find(p => p.id === screen.assigned_playlist_id)?.name || <span className="text-slate-300">None</span>}</span></div>
                  {screen.ticker_enabled && <div className="flex justify-between"><span className="text-slate-400">Ticker</span><span className="text-teal-600">✓ Enabled</span></div>}
                  {screen.queue_panel_enabled && <div className="flex justify-between"><span className="text-slate-400">Queue Panel</span><span className="text-blue-600">✓ Enabled</span></div>}
                  <div className="flex justify-between"><span className="text-slate-400">Last seen</span>
                    <span className={getHeartbeatStatus(screen) === 'offline' ? 'text-red-500' : ''}>
                      {screen.last_seen_at ? formatDistanceToNow(new Date(screen.last_seen_at), { addSuffix: true }) : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(screen)} className="gap-1"><Edit2 className="w-3 h-3" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => openPreview(screen)} className="gap-1"><Eye className="w-3 h-3" /> Preview</Button>
                  <Button size="sm" variant="outline" onClick={() => remoteRefresh.mutate(screen)} className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"><RotateCcw className="w-3 h-3" /> Refresh</Button>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(getPlayerUrl(screen.screen_key)); toast.success('URL copied!'); }} className="gap-1"><Copy className="w-3 h-3" /> URL</Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(getPlayerUrl(screen.screen_key), '_blank')} className="gap-1"><ExternalLink className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 gap-1" onClick={() => { if (confirm('Delete this screen?')) remove.mutate(screen); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="col-span-3 text-center py-16 text-slate-400">No screens found.</p>}
        </div>
      )}

      {/* TV Preview Modal */}
      {previewScreen && (
        <SignageTVPreview items={previewItems} screen={previewScreen} onClose={() => setPreviewScreen(null)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Screen' : 'Add Screen'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Screen Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Waiting Room TV 1" /></div>
              <div><Label>Clinic Name</Label><Input value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location Type</Label>
                <Select value={form.location_type} onValueChange={v => setForm({ ...form, location_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOCATION_TYPES.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Orientation</Label>
                <Select value={form.orientation} onValueChange={v => setForm({ ...form, orientation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                    <SelectItem value="portrait">Portrait (9:16)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Theme</Label>
                <Select value={form.theme} onValueChange={v => setForm({ ...form, theme: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{THEMES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Assign Playlist</Label>
                <Select value={form.assigned_playlist_id || '__none__'} onValueChange={v => setForm({ ...form, assigned_playlist_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Clinic Logo URL</Label><Input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Display Options</p>
              <div className="flex items-center gap-3">
                <Switch checked={form.ticker_enabled} onCheckedChange={v => setForm({ ...form, ticker_enabled: v })} />
                <Label>Enable Ticker Bar (scrolling text at bottom)</Label>
              </div>
              {form.ticker_enabled && (
                <div><Label>Ticker Text</Label><Input value={form.ticker_text} onChange={e => setForm({ ...form, ticker_text: e.target.value })} placeholder="Welcome to our clinic! Opening hours: Mon-Fri 8am–6pm..." /></div>
              )}
              <div className="flex items-center gap-3">
                <Switch checked={form.queue_panel_enabled} onCheckedChange={v => setForm({ ...form, queue_panel_enabled: v })} />
                <Label>Enable Queue Panel (Now Serving panel on right)</Label>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-1">
                <Label>Screen Key *</Label>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setForm({ ...form, screen_key: genKey() })}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                </Button>
              </div>
              <Input value={form.screen_key} onChange={e => setForm({ ...form, screen_key: e.target.value })} className="font-mono" />
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