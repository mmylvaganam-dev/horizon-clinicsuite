import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Edit2, Trash2, Radio } from 'lucide-react';
import toast from 'react-hot-toast';

const SEVERITY_STYLES = {
  urgent: { badge: 'bg-red-600 text-white', border: 'border-red-300 bg-red-50', icon: 'text-red-600' },
  warning: { badge: 'bg-amber-500 text-white', border: 'border-amber-300 bg-amber-50', icon: 'text-amber-600' },
  info: { badge: 'bg-blue-600 text-white', border: 'border-blue-300 bg-blue-50', icon: 'text-blue-600' },
};

const emptyForm = { title: '', message: '', severity: 'info', is_active: false, start_at: '', end_at: '' };

export default function SignageEmergencyBanner() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: banners = [], isLoading } = useQuery({ queryKey: ['emergencyBanners'], queryFn: () => base44.entities.EmergencyBanner.list() });

  const upsert = useMutation({
    mutationFn: d => editing ? base44.entities.EmergencyBanner.update(editing.id, d) : base44.entities.EmergencyBanner.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emergencyBanners'] }); setOpen(false); toast.success(editing ? 'Banner updated' : 'Banner created'); }
  });
  const remove = useMutation({
    mutationFn: id => base44.entities.EmergencyBanner.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emergencyBanners'] }); toast.success('Banner deleted'); }
  });
  const toggle = useMutation({
    mutationFn: b => base44.entities.EmergencyBanner.update(b.id, { is_active: !b.is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emergencyBanners'] }); toast.success('Banner updated'); }
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = b => { setEditing(b); setForm({ title: b.title, message: b.message, severity: b.severity, is_active: b.is_active || false, start_at: b.start_at || '', end_at: b.end_at || '' }); setOpen(true); };

  const activeBanners = banners.filter(b => b.is_active);
  const inactiveBanners = banners.filter(b => !b.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emergency Banners</h1>
          <p className="text-slate-500 text-sm">Active banners display on all screens immediately, overriding normal content</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Banner</Button>
      </div>

      {activeBanners.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-5 h-5 text-red-600 animate-pulse" />
            <span className="font-bold text-red-800 text-lg">LIVE — {activeBanners.length} banner(s) broadcasting now</span>
          </div>
          <div className="space-y-3">
            {activeBanners.map(b => <BannerCard key={b.id} b={b} onEdit={openEdit} onDelete={id => { if (confirm('Delete?')) remove.mutate(id); }} onToggle={() => toggle.mutate(b)} />)}
          </div>
        </div>
      )}

      {inactiveBanners.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Inactive / Scheduled ({inactiveBanners.length})</p>
          <div className="space-y-3">
            {inactiveBanners.map(b => <BannerCard key={b.id} b={b} onEdit={openEdit} onDelete={id => { if (confirm('Delete?')) remove.mutate(id); }} onToggle={() => toggle.mutate(b)} />)}
          </div>
        </div>
      )}

      {banners.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">No emergency banners yet</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Create First Banner</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Banner' : 'New Emergency Banner'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Clinic closed today" /></div>
            <div><Label>Message *</Label><Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} placeholder="Please contact us at..." /></div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ Info (Blue)</SelectItem>
                  <SelectItem value="warning">⚠ Warning (Amber)</SelectItem>
                  <SelectItem value="urgent">🚨 Urgent (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start At</Label><Input type="datetime-local" value={form.start_at} onChange={e => setForm({ ...form, start_at: e.target.value })} /></div>
              <div><Label>End At</Label><Input type="datetime-local" value={form.end_at} onChange={e => setForm({ ...form, end_at: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <div>
                <p className="font-medium text-sm">Activate immediately</p>
                <p className="text-xs text-slate-500">Will broadcast to all screens right away</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(form)} disabled={!form.title || !form.message || upsert.isPending}>
                {upsert.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BannerCard({ b, onEdit, onDelete, onToggle }) {
  const s = SEVERITY_STYLES[b.severity] || SEVERITY_STYLES.info;
  return (
    <Card className={`border ${s.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s.icon}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-slate-900">{b.title}</p>
                <Badge className={s.badge}>{b.severity}</Badge>
              </div>
              <p className="text-sm text-slate-600">{b.message}</p>
              {(b.start_at || b.end_at) && (
                <p className="text-xs text-slate-400 mt-1">
                  {b.start_at && `From ${new Date(b.start_at).toLocaleString()}`}{b.end_at && ` until ${new Date(b.end_at).toLocaleString()}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{b.is_active ? 'Live' : 'Off'}</span>
              <Switch checked={b.is_active} onCheckedChange={onToggle} />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => onEdit(b)} className="h-7"><Edit2 className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" className="h-7 text-red-500" onClick={() => onDelete(b.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}