import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Messaging() {
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState(null);
  const [messageBody, setMessageBody] = useState('');
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadPatient, setNewThreadPatient] = useState('');
  const [newThreadSubject, setNewThreadSubject] = useState('');

  const { data: threads = [] } = useQuery({
    queryKey: ['messageThreads'],
    queryFn: () => base44.entities.MessageThread.list('-last_message_at'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedThread?.id],
    queryFn: () => base44.entities.Message.filter({ thread_id: selectedThread.id }),
    enabled: !!selectedThread
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, body }) => {
      const user = await base44.auth.me();
      const thread = threads.find(t => t.id === threadId);
      
      const message = await base44.entities.Message.create({
        thread_id: threadId,
        sender_type: 'staff',
        sender_ref: user.id,
        sender_name: user.full_name,
        body,
        created_at: new Date().toISOString()
      });

      await base44.entities.MessageThread.update(threadId, {
        last_message_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: thread.organization_id || '',
        location_id: '',
        patient_id: thread.patient_ref || '',
        module: 'MESSAGING',
        action: 'send_message',
        record_type: 'Message',
        record_id: message.id,
        metadata: { thread_id: threadId, sender_type: 'staff' }
      });

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      setMessageBody('');
      toast.success('Message sent!');
    }
  });

  const createThreadMutation = useMutation({
    mutationFn: async ({ patientId, subject }) => {
      const user = await base44.auth.me();
      
      const thread = await base44.entities.MessageThread.create({
        organization_id: '',
        patient_ref: patientId,
        subject,
        status: 'open',
        created_at: new Date().toISOString(),
        created_by: user.id,
        last_message_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: patientId,
        module: 'MESSAGING',
        action: 'create_thread',
        record_type: 'MessageThread',
        record_id: thread.id,
        metadata: { subject }
      });

      return thread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      setShowNewThreadDialog(false);
      setNewThreadPatient('');
      setNewThreadSubject('');
      toast.success('Thread created!');
    }
  });

  const closeThreadMutation = useMutation({
    mutationFn: async (threadId) => {
      const user = await base44.auth.me();
      const thread = threads.find(t => t.id === threadId);
      
      await base44.entities.MessageThread.update(threadId, {
        status: 'closed'
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: thread.organization_id || '',
        location_id: '',
        patient_id: thread.patient_ref || '',
        module: 'MESSAGING',
        action: 'close_thread',
        record_type: 'MessageThread',
        record_id: threadId,
        metadata: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      toast.success('Thread closed!');
    }
  });

  const markAsRead = async (messageId) => {
    const user = await base44.auth.me();
    const message = messages.find(m => m.id === messageId);
    
    if (!message.read_at) {
      await base44.entities.Message.update(messageId, {
        read_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: selectedThread.patient_ref || '',
        module: 'MESSAGING',
        action: 'read_message',
        record_type: 'Message',
        record_id: messageId,
        metadata: { thread_id: selectedThread.id }
      });

      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  };

  const getPatientName = (patientRef) => {
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const handleSendMessage = () => {
    if (!messageBody.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    sendMessageMutation.mutate({ threadId: selectedThread.id, body: messageBody });
  };

  const handleCreateThread = () => {
    if (!newThreadPatient || !newThreadSubject.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    createThreadMutation.mutate({ patientId: newThreadPatient, subject: newThreadSubject });
  };

  const unreadCount = (threadId) => {
    const threadMessages = messages.filter(m => m.thread_id === threadId && !m.read_at && m.sender_type === 'patient');
    return threadMessages.length;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Thread List */}
      <div className="w-1/3 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle>Conversations</CardTitle>
              <Button size="sm" onClick={() => setShowNewThreadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 p-4">
            {threads.map((thread) => (
              <Card
                key={thread.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedThread?.id === thread.id ? 'bg-teal-50 border-teal-500' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedThread(thread)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={thread.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {thread.status}
                      </Badge>
                      {unreadCount(thread.id) > 0 && (
                        <Badge className="bg-rose-500">{unreadCount(thread.id)}</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{thread.subject || 'No subject'}</p>
                    <p className="text-xs text-slate-500">{getPatientName(thread.patient_ref)}</p>
                    {thread.last_message_at && (
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(thread.last_message_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedThread.subject || 'No subject'}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    {getPatientName(selectedThread.patient_ref)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedThread.status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeThreadMutation.mutate(selectedThread.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close Thread
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
                  onMouseEnter={() => markAsRead(msg.id)}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      msg.sender_type === 'staff'
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="text-xs opacity-70 mb-1">{msg.sender_name || 'Unknown'}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                      {msg.read_at && ' • Read'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
            {selectedThread.status === 'open' && (
              <div className="flex-shrink-0 p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={sendMessageMutation.isPending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Select a conversation to view messages</p>
            </div>
          </Card>
        )}
      </div>

      {/* New Thread Dialog */}
      <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Patient *</Label>
              <Select value={newThreadPatient} onValueChange={setNewThreadPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input
                value={newThreadSubject}
                onChange={(e) => setNewThreadSubject(e.target.value)}
                placeholder="Enter subject"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewThreadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateThread} disabled={createThreadMutation.isPending}>
                Create Thread
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}