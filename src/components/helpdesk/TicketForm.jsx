import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, X, AlertCircle, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TicketForm({ organizationId, currentUser, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'software', priority: 'medium',
    submitter_name: currentUser?.full_name || '',
    submitter_email: currentUser?.email || '',
    submitter_type: 'staff',
    error_message: '', hoptodesk_id: '',
    screenshot_urls: []
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
    } catch (e) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.submitter_email) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const count = await base44.entities.HelpDeskTicket.list('-created_date', 1);
      const num = `TKT-${String((count?.length || 0) + Math.floor(Math.random() * 9000) + 1000).padStart(5, '0')}`;
      const ticket = await base44.entities.HelpDeskTicket.create({
        ...form,
        organization_id: organizationId,
        ticket_number: num,
        status: 'open'
      });
      // System message
      await base44.entities.HelpDeskMessage.create({
        ticket_id: ticket.id,
        sender_email: 'system',
        sender_name: 'System',
        sender_type: 'system',
        message: `Ticket ${num} created by ${form.submitter_name || form.submitter_email}.`,
        is_internal: true
      });
      base44.functions.invoke('helpdeskNotify', { event: 'ticket_created', ticket }).catch(() => {});
      toast.success(`Ticket ${num} created!`);
      onSuccess(ticket);
    } catch (err) {
      toast.error('Failed to create ticket');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Your Name</Label>
          <Input value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <Label>Email *</Label>
          <Input type="email" value={form.submitter_email} onChange={e => set('submitter_email', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>I am a</Label>
          <Select value={form.submitter_type} onValueChange={v => set('submitter_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff Member</SelectItem>
              <SelectItem value="client">External Client</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        <Textarea value={form.error_message} onChange={e => set('error_message', e.target.value)} rows={3} placeholder="Paste any error messages or stack traces here..." className="font-mono text-xs" />
      </div>

      <div>
        <Label className="flex items-center gap-2"><Monitor className="w-4 h-4 text-blue-500" /> HopToDesk ID (for remote support)</Label>
        <Input value={form.hoptodesk_id} onChange={e => set('hoptodesk_id', e.target.value)} placeholder="Your HopToDesk 9-digit ID e.g. 123 456 789" />
        <p className="text-xs text-slate-400 mt-1">
          Download HopToDesk from <a href="https://www.hoptodesk.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">hoptodesk.com</a> — share your ID so support can connect remotely.
        </p>
      </div>

      <div>
        <Label>Screenshots / Attachments</Label>
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
          <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-500 mb-2">Upload screenshots or files</p>
          <input type="file" multiple accept="image/*,.pdf,.txt,.log" onChange={handleFileUpload} className="hidden" id="ticket-upload" />
          <label htmlFor="ticket-upload">
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

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
          {saving ? 'Submitting...' : 'Submit Ticket'}
        </Button>
      </div>
    </form>
  );
}