import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, MessageSquare, Send, Plus, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Communications() {
  const queryClient = useQueryClient();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showBulkSendDialog, setShowBulkSendDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    channel: 'email',
    name: '',
    subject: '',
    body: ''
  });
  const [bulkForm, setBulkForm] = useState({
    templateId: '',
    recipientFilter: 'all'
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list('-created_at'),
  });

  const { data: outboundMessages = [] } = useQuery({
    queryKey: ['outboundMessages'],
    queryFn: () => base44.entities.OutboundMessage.list('-sent_at', 100),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: optOuts = [] } = useQuery({
    queryKey: ['optOutLogs'],
    queryFn: () => base44.entities.OptOutLog.list(),
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const template = await base44.entities.MessageTemplate.create({
        ...data,
        created_at: new Date().toISOString(),
        created_by: user.id
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'COMMUNICATIONS',
        action: 'create_template',
        record_type: 'MessageTemplate',
        record_id: template.id,
        metadata: { channel: data.channel, name: data.name }
      });

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      resetTemplateForm();
      toast.success('Template created!');
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      const template = await base44.entities.MessageTemplate.update(id, data);

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: template.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'COMMUNICATIONS',
        action: 'update_template',
        record_type: 'MessageTemplate',
        record_id: id,
        metadata: { channel: template.channel, name: template.name }
      });

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      resetTemplateForm();
      toast.success('Template updated!');
    }
  });

  const bulkSendMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendBulkMessages', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['outboundMessages'] });
      setShowBulkSendDialog(false);
      toast.success(`Sent ${data.sent} messages, skipped ${data.skipped} (no consent/opt-out)`);
    }
  });

  const resetTemplateForm = () => {
    setTemplateForm({ channel: 'email', name: '', subject: '', body: '' });
    setEditingTemplate(null);
    setShowTemplateDialog(false);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      channel: template.channel,
      name: template.name,
      subject: template.subject || '',
      body: template.body
    });
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.body) {
      toast.error('Please fill required fields');
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleBulkSend = () => {
    if (!bulkForm.templateId) {
      toast.error('Please select a template');
      return;
    }
    bulkSendMutation.mutate(bulkForm);
  };

  const statusColors = {
    queued: 'bg-blue-100 text-blue-700',
    sent: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Communications</h1>
        <p className="text-slate-500 mt-1">Manage message templates and bulk communications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Templates</p>
              <p className="text-2xl font-bold">{templates.filter(t => t.is_active).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Send className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Messages Sent</p>
              <p className="text-2xl font-bold">
                {outboundMessages.filter(m => m.status === 'sent').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Opt-Outs</p>
              <p className="text-2xl font-bold">{optOuts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
          <TabsTrigger value="optouts">Opt-Outs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="flex justify-end gap-2">
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
            <Button onClick={() => setShowBulkSendDialog(true)} variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Bulk Send
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {templates.map((template) => (
              <Card key={template.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={template.channel === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                        {template.channel}
                      </Badge>
                      <Badge variant="outline" className={template.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-900">{template.name}</p>
                    {template.subject && (
                      <p className="text-sm text-slate-600 mt-1">Subject: {template.subject}</p>
                    )}
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{template.body}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)}>
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-6">
          {outboundMessages.map((msg) => (
            <Card key={msg.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={msg.channel === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                      {msg.channel}
                    </Badge>
                    <Badge variant="outline" className={statusColors[msg.status]}>
                      {msg.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-900">To: {msg.recipient_contact}</p>
                  {msg.subject && (
                    <p className="text-sm text-slate-600">Subject: {msg.subject}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {msg.sent_at ? format(new Date(msg.sent_at), 'MMM d, yyyy h:mm a') : 'Not sent'}
                  </p>
                  {msg.error_message && (
                    <p className="text-xs text-rose-600 mt-1">Error: {msg.error_message}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="optouts" className="space-y-3 mt-6">
          {optOuts.map((optOut) => {
            const patient = patients.find(p => p.id === optOut.recipient_ref);
            return (
              <Card key={optOut.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-rose-100 text-rose-700">
                        {optOut.channel}
                      </Badge>
                    </div>
                    <p className="font-medium">
                      {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Opted out: {format(new Date(optOut.opted_out_at), 'MMM d, yyyy')}
                    </p>
                    {optOut.reason && (
                      <p className="text-sm text-slate-600 mt-1">Reason: {optOut.reason}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Channel *</Label>
                <Select value={templateForm.channel} onValueChange={(val) => setTemplateForm({ ...templateForm, channel: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Template name"
                />
              </div>
            </div>
            {templateForm.channel === 'email' && (
              <div>
                <Label>Subject</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>
            )}
            <div>
              <Label>Body *</Label>
              <Textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                placeholder="Use {{patient_name}}, {{appointment_date}}, etc."
                rows={8}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetTemplateForm}>Cancel</Button>
              <Button onClick={handleSaveTemplate}>
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Dialog */}
      <Dialog open={showBulkSendDialog} onOpenChange={setShowBulkSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Send Messages</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Template *</Label>
              <Select value={bulkForm.templateId} onValueChange={(val) => setBulkForm({ ...bulkForm, templateId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipients</Label>
              <Select value={bulkForm.recipientFilter} onValueChange={(val) => setBulkForm({ ...bulkForm, recipientFilter: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients with Consent</SelectItem>
                  <SelectItem value="active">Active Patients Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Only patients who have consented to communications and have not opted out will receive messages.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkSendDialog(false)}>Cancel</Button>
              <Button onClick={handleBulkSend} disabled={bulkSendMutation.isPending}>
                {bulkSendMutation.isPending ? 'Sending...' : 'Send Messages'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}