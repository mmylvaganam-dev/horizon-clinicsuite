import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Image, FileText, Video, Globe, Eye, EyeOff, GraduationCap, CheckCircle, Clock, XCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';
import SignageTVPreview from '../components/signage/SignageTVPreview';

const TYPE_ICONS = { image: Image, video: Video, text: FileText, webpage: Globe };
const TYPE_COLORS = { image: 'text-purple-600 bg-purple-50', video: 'text-red-600 bg-red-50', text: 'text-teal-600 bg-teal-50', webpage: 'text-blue-600 bg-blue-50' };

const emptyForm = {
  title: '', type: 'text', media_url: '', headline: '', body_text: '', cta_text: '',
  background_color: '#0d9488', is_active: true, is_health_education: false,
  start_at: '', end_at: '', layout_style: 'hero', template_type: 'general_announcement',
  approval_status: 'draft'
};

const APPROVAL_STYLES = {
  draft:    { label: 'Draft',    icon: Clock,         class: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', icon: CheckCircle,   class: 'bg-green-100 text-green-800' },
  published:{ label: 'Published',icon: CheckCircle,   class: 'bg-teal-100 text-teal-800' },
};

export default function SignageContent() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [filterEdu, setFilterEdu] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [previewItem, setPreviewItem] = useState(null);
  const [filterApproval, setFilterApproval] = useState('all');

  const { data: items = [], isLoading } = useQuery({ queryKey: ['signageItems'], queryFn: () => base44.entities.SignageItem.list() });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const logAudit = async (action, item, changes = '') => {
    await base44.entities.SignageAuditLog.create({
      entity_type: 'item', entity_id: item.id || 'new', entity_name: item.title,
      action, changed_by_email: user?.email || 'unknown', changes_summary: changes
    });
  };

  const upsert = useMutation({
    mutationFn: d => editing ? base44.entities.SignageItem.update(editing.id, d) : base44.entities.SignageItem.create(d),
    onSuccess: async (res, vars) => {
      await logAudit(editing ? 'updated' : 'created', { id: res?.id || editing?.id, title: vars.title }, editing ? 'Updated content item' : 'Created new content item');
      qc.invalidateQueries({ queryKey: ['signageItems'] });
      setOpen(false);
      toast.success(editing ? 'Item updated' : 'Item created');
    }
  });

  const remove = useMutation({
    mutationFn: async (item) => { await base44.entities.SignageItem.delete(item.id); return item; },
    onSuccess: async (item) => {
      await logAudit('deleted', item, 'Item deleted');
      qc.invalidateQueries({ queryKey: ['signageItems'] });
      toast.success('Item deleted');
    }
  });

  const toggleActive = useMutation({
    mutationFn: item => base44.entities.SignageItem.update(item.id, { is_active: !item.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signageItems'] })
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = item => {
    setEditing(item);
    setForm({
      title: item.title, type: item.type, media_url: item.media_url || '',
      headline: item.headline || '', body_text: item.body_text || '', cta_text: item.cta_text || '',
      background_color: item.background_color || '#0d9488', is_active: item.is_active !== false,
      is_health_education: item.is_health_education || false, start_at: item.start_at || '', end_at: item.end_at || '',
      layout_style: item.layout_style || 'hero', template_type: item.template_type || 'general_announcement',
      approval_status: item.approval_status || 'draft'
    });
    setOpen(true);
  };

  const approve = useMutation({
    mutationFn: item => base44.entities.SignageItem.update(item.id, {
      approval_status: 'approved', is_active: true,
      approved_by: user?.email, approved_at: new Date().toISOString()
    }),
    onSuccess: async (_, item) => {
      await logAudit('updated', item, 'Content approved — now active and assignable to playlists');
      qc.invalidateQueries({ queryKey: ['signageItems'] });
      toast.success('Content approved and activated!');
    }
  });

  const isAdmin = user?.role === 'admin';

  const filtered = items.filter(item => {
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterActive === 'active' && !item.is_active) return false;
    if (filterActive === 'inactive' && item.is_active) return false;
    if (filterEdu && !item.is_health_education) return false;
    if (filterApproval !== 'all' && (item.approval_status || 'draft') !== filterApproval) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Library</h1>
          <p className="text-slate-500 text-sm">Create and manage signage content · only Approved items can be added to playlists</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('SignageContentCreator')}>
            <Button variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50">
              <Sparkles className="w-4 h-4" /> AI Creator
            </Button>
          </Link>
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Item</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Input placeholder="Search content..." value={search} onChange={e => setSearch(e.target.value)} className="w-52" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="webpage">Webpage</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterApproval} onValueChange={setFilterApproval}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setFilterEdu(!filterEdu)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${filterEdu ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'}`}
        >
          <GraduationCap className="w-4 h-4" /> Health Edu Only
        </button>
      </div>

      {isLoading ? <p className="text-center py-16 text-slate-400">Loading...</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(item => {
            const Icon = TYPE_ICONS[item.type] || FileText;
            const colorClass = TYPE_COLORS[item.type] || TYPE_COLORS.text;
            return (
              <Card key={item.id} className={`overflow-hidden transition-shadow hover:shadow-md ${!item.is_active ? 'opacity-60' : ''}`}>
                <div className="h-32 flex items-center justify-center relative overflow-hidden"
                  style={{ background: item.type === 'text' ? (item.background_color || '#0d9488') : '#1e293b' }}>
                  {item.type === 'image' && item.media_url ? (
                    <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : item.type === 'text' ? (
                    <div className="text-center px-4">
                      {item.headline && <p className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">{item.headline}</p>}
                      {item.body_text && <p className="text-white/80 text-xs line-clamp-2">{item.body_text}</p>}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Icon className="w-8 h-8 text-slate-400" />
                      <p className="text-slate-500 text-xs truncate max-w-[160px]">{item.media_url || 'No URL set'}</p>
                    </div>
                  )}
                  {!item.is_active && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Badge className="bg-slate-700 text-white">Inactive</Badge>
                    </div>
                  )}
                  {item.is_health_education && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-600 text-white gap-1"><GraduationCap className="w-3 h-3" /> Edu</Badge>
                    </div>
                  )}
                  {/* Approval status badge */}
                  {(item.approval_status || 'draft') !== 'approved' && (
                    <div className="absolute bottom-2 left-2">
                      <Badge className={APPROVAL_STYLES[item.approval_status || 'draft']?.class || 'bg-amber-100 text-amber-800'}>
                        {APPROVAL_STYLES[item.approval_status || 'draft']?.label || 'Draft'}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{item.title}</p>
                    <Badge className={colorClass}>{item.type}</Badge>
                  </div>
                  {(item.start_at || item.end_at) && (
                    <p className="text-xs text-slate-400 mb-2">
                      {item.start_at ? `From ${new Date(item.start_at).toLocaleDateString()}` : ''}
                      {item.end_at ? ` to ${new Date(item.end_at).toLocaleDateString()}` : ''}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)} className="gap-1 flex-1"><Edit2 className="w-3 h-3" /> Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => setPreviewItem(item)} title="Preview"><Eye className="w-3 h-3" /></Button>
                    {isAdmin && (item.approval_status || 'draft') === 'draft' && (
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => approve.mutate(item)} title="Approve">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => { if (confirm('Delete this item?')) remove.mutate(item); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="col-span-3 text-center py-16 text-slate-400">No content items found.</p>}
        </div>
      )}

      {previewItem && (
        <SignageTVPreview items={[previewItem]} screen={null} onClose={() => setPreviewItem(null)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Content' : 'New Content Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Content Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text / Announcement</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="webpage">Webpage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form.type === 'image' || form.type === 'video' || form.type === 'webpage') && (
              <div><Label>URL *</Label><Input value={form.media_url} onChange={e => setForm({ ...form, media_url: e.target.value })} placeholder="https://..." /></div>
            )}

            {form.type === 'text' && (
              <>
                <div><Label>Headline</Label><Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Large headline text" /></div>
                <div><Label>Body Text</Label><Textarea value={form.body_text} onChange={e => setForm({ ...form, body_text: e.target.value })} rows={3} /></div>
                <div><Label>Call to Action Text</Label><Input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} placeholder="Please see the front desk" /></div>
                <div>
                  <Label>Background Color</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.background_color} onChange={e => setForm({ ...form, background_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={form.background_color} onChange={e => setForm({ ...form, background_color: e.target.value })} className="font-mono" />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template Type</Label>
                <Select value={form.template_type || 'general_announcement'} onValueChange={v => setForm({ ...form, template_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['health_tip','promo','emergency','service_ad','queue','general_announcement'].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Layout Style</Label>
                <Select value={form.layout_style || 'hero'} onValueChange={v => setForm({ ...form, layout_style: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['hero','split','banner','sidebar','fullscreen'].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Show From</Label><Input type="datetime-local" value={form.start_at} onChange={e => setForm({ ...form, start_at: e.target.value })} /></div>
              <div><Label>Show Until</Label><Input type="datetime-local" value={form.end_at} onChange={e => setForm({ ...form, end_at: e.target.value })} /></div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_health_education} onCheckedChange={v => setForm({ ...form, is_health_education: v })} />
              <Label className="flex items-center gap-1"><GraduationCap className="w-4 h-4 text-green-600" /> Health Education Content</Label>
            </div>

            {isAdmin && (
              <div>
                <Label>Approval Status</Label>
                <Select value={form.approval_status || 'draft'} onValueChange={v => setForm({ ...form, approval_status: v, is_active: v === 'approved' || v === 'published' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (not assignable)</SelectItem>
                    <SelectItem value="approved">Approved (active)</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(form)} disabled={!form.title || upsert.isPending}>
                {upsert.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}