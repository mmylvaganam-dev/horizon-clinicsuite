import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Ticket, Plus, Upload, X, AlertCircle, Monitor, Clock, CheckCircle2, RefreshCw, ArrowLeft, ExternalLink, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting_client: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600'
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_client: 'Waiting on You',
  resolved: 'Resolved',
  closed: 'Closed'
};

function IdentityStep({ onConfirm }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgId, setOrgId] = useState('');

  const { data: organizations = [] } = useQuery({
    queryKey: ['public_organizations'],
    queryFn: () => base44.entities.Organization.filter({ status: 'active' }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !orgId) {
      toast.error('Please fill in all fields');
      return;
    }
    onConfirm({ name: name.trim(), email: email.trim().toLowerCase(), orgId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Ticket className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Client Support Portal</h1>
          <p className="text-slate-500 mt-2">Submit and track your support requests</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Organization *</Label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {org.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Your Full Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Smith" required />
              </div>
              <div>
                <Label>Your Email Address *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                <p className="text-xs text-slate-400 mt-1">Used to identify your tickets — no account needed.</p>
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-11 text-base">
                Continue to Portal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewTicketForm({ identity, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'software', priority: 'medium',
    error_message: '', hoptodesk_id: '', screenshot_urls: []
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      set('screenshot_urls', [...form.screenshot_urls, ...urls]);
      toast.success(`${urls.length} file(s) uploaded`);
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const count = await base44.entities.HelpDeskTicket.list('-created_date', 1);
      const num = `TKT-${String((count?.length || 0) + Math.floor(Math.random() * 9000) + 1000).padStart(5, '0')}`;
      const ticket = await base44.entities.HelpDeskTicket.create({
        ...form,
        organization_id: identity.orgId,
        ticket_number: num,
        status: 'open',
        submitter_name: identity.name,
        submitter_email: identity.email,
        submitter_type: 'client',
      });
      await base44.entities.HelpDeskMessage.create({
        ticket_id: ticket.id,
        sender_email: 'system',
        sender_name: 'System',
        sender_type: 'system',
        message: `Ticket ${num} submitted by client ${identity.name} (${identity.email}).`,
        is_internal: true
      });
      base44.functions.invoke('helpdeskNotify', { event: 'ticket_created', ticket }).catch(() => {});
      toast.success(`Ticket ${num} submitted!`);
      onSuccess(ticket);
    } catch {
      toast.error('Failed to submit ticket');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['software','hardware','network','billing','access','other'].map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => set('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="critical">🔴 Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Issue Title *</Label>
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Short summary of the issue" required />
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe the issue in detail..." required />
      </div>

      <div>
        <Label className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Error Message / Logs (optional)</Label>
        <Textarea value={form.error_message} onChange={e => set('error_message', e.target.value)} rows={3} placeholder="Paste any error messages here..." className="font-mono text-xs" />
      </div>

      <div>
        <Label className="flex items-center gap-2"><Monitor className="w-4 h-4 text-blue-500" /> HopToDesk ID (for remote support, optional)</Label>
        <Input value={form.hoptodesk_id} onChange={e => set('hoptodesk_id', e.target.value)} placeholder="e.g. 123 456 789" />
        <p className="text-xs text-slate-400 mt-1">
          Download from <a href="https://www.hoptodesk.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">hoptodesk.com</a> — share your ID so support can connect remotely.
        </p>
      </div>

      <div>
        <Label>Screenshots / Attachments</Label>
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
          <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-500 mb-2">Upload screenshots or files</p>
          <input type="file" multiple accept="image/*,.pdf,.txt,.log" onChange={handleFileUpload} className="hidden" id="client-upload" />
          <label htmlFor="client-upload">
            <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
              <span className="cursor-pointer">{uploading ? 'Uploading...' : 'Choose Files'}</span>
            </Button>
          </label>
        </div>
        {form.screenshot_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.screenshot_urls.map((url, i) => (
              <div key={i} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs">
                <span>File {i + 1}</span>
                <button type="button" onClick={() => set('screenshot_urls', form.screenshot_urls.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
          {saving ? 'Submitting...' : 'Submit Ticket'}
        </Button>
      </div>
    </form>
  );
}

function TicketList({ identity, onNewTicket }) {
  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['client_tickets', identity.email, identity.orgId],
    queryFn: () => base44.entities.HelpDeskTicket.filter({
      submitter_email: identity.email,
      organization_id: identity.orgId,
    }, '-created_date'),
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="py-16 text-center">
      <RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin mb-3" />
      <p className="text-slate-400">Loading your tickets...</p>
    </div>
  );

  if (tickets.length === 0) return (
    <div className="py-16 text-center">
      <Ticket className="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <p className="text-slate-500 font-medium">No tickets yet</p>
      <p className="text-slate-400 text-sm mt-1">Submit your first support request below</p>
      <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={onNewTicket}>
        <Plus className="w-4 h-4 mr-2" />New Ticket
      </Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} found</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" />Refresh
        </Button>
      </div>
      {tickets.map(ticket => (
        <Card key={ticket.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-mono text-xs text-slate-400">{ticket.ticket_number}</span>
                  <Badge className={`text-xs ${STATUS_COLORS[ticket.status]}`}>
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </Badge>
                  <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{ticket.category}</Badge>
                </div>
                <p className="font-semibold text-slate-900">{ticket.title}</p>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{ticket.description}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Submitted {format(new Date(ticket.created_date), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="shrink-0">
                {ticket.status === 'resolved' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                {(ticket.status === 'open' || ticket.status === 'in_progress') && <Clock className="w-6 h-6 text-blue-400" />}
                {ticket.status === 'waiting_client' && <AlertCircle className="w-6 h-6 text-amber-500" />}
              </div>
            </div>
            {ticket.resolution_notes && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <p className="font-medium mb-1">Resolution:</p>
                <p>{ticket.resolution_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ClientPortal() {
  const [identity, setIdentity] = useState(() => {
    try { return JSON.parse(localStorage.getItem('client_portal_identity')); } catch { return null; }
  });
  const [view, setView] = useState('list'); // 'list' | 'new' | 'success'
  const [lastTicket, setLastTicket] = useState(null);

  const handleConfirmIdentity = (id) => {
    localStorage.setItem('client_portal_identity', JSON.stringify(id));
    setIdentity(id);
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('client_portal_identity');
    setIdentity(null);
    setView('list');
  };

  if (!identity) {
    return <IdentityStep onConfirm={handleConfirmIdentity} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-tight">Client Support Portal</p>
              <p className="text-xs text-slate-500">Logged in as {identity.name} · {identity.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500"
              onClick={handleSwitchAccount}
            >
              Switch Account
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => setView('new')}
            >
              <Plus className="w-4 h-4 mr-1" />New Ticket
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {view === 'success' && lastTicket && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Ticket {lastTicket.ticket_number} submitted!</p>
                  <p className="text-sm text-green-700">Our support team will be in touch shortly.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView('list')}>
                <X className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {view === 'new' ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <CardTitle className="text-lg">Submit a Support Ticket</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <NewTicketForm
                identity={identity}
                onSuccess={(ticket) => {
                  setLastTicket(ticket);
                  setView('success');
                }}
                onCancel={() => setView('list')}
              />
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Your Tickets</h2>
            <TicketList identity={identity} onNewTicket={() => setView('new')} />
          </div>
        )}
      </div>

      <div className="text-center py-6 text-xs text-slate-400">
        Need remote assistance? Download <a href="https://www.hoptodesk.com" target="_blank" rel="noreferrer" className="text-teal-600 underline">HopToDesk</a> and share your ID when submitting a ticket.
      </div>
    </div>
  );
}