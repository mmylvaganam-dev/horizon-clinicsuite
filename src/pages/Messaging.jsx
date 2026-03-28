import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, X, Plus, AlertTriangle, Clock, Users, Search, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const URGENCY_STYLES = {
  normal: { label: 'Normal', badge: 'bg-slate-100 text-slate-700' },
  urgent: { label: '🟡 Urgent', badge: 'bg-amber-100 text-amber-700' },
  critical: { label: '🔴 Critical', badge: 'bg-red-100 text-red-700 font-bold' },
};

export default function Messaging() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messageBody, setMessageBody] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadPatient, setNewThreadPatient] = useState('');
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [newThreadUrgency, setNewThreadUrgency] = useState('normal');
  const [filterStatus, setFilterStatus] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: threads = [] } = useQuery({
    queryKey: ['messageThreads'],
    queryFn: () => base44.entities.MessageThread.list('-last_message_at', 100),
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedThread?.id],
    queryFn: () => base44.entities.Message.filter({ thread_id: selectedThread.id }, 'created_at'),
    enabled: !!selectedThread,
    refetchInterval: 10000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!messageBody.trim()) return;
      await base44.entities.Message.create({
        thread_id: selectedThread.id,
        sender_type: 'staff',
        sender_ref: user?.id || '',
        sender_name: user?.full_name || user?.email || 'Staff',
        body: messageBody.trim(),
        urgency_flag: urgency,
        created_at: new Date().toISOString(),
      });
      await base44.entities.MessageThread.update(selectedThread.id, {
        last_message_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedThread?.id] });
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      setMessageBody('');
      setUrgency('normal');
    },
    onError: () => toast.error('Failed to send message'),
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      if (!newThreadSubject.trim()) return;
      const thread = await base44.entities.MessageThread.create({
        patient_ref: newThreadPatient || null,
        subject: newThreadSubject.trim(),
        status: 'open',
        thread_type: 'case_discussion',
        urgency_flag: newThreadUrgency,
        created_by: user?.email || '',
        last_message_at: new Date().toISOString(),
      });
      return thread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      setShowNewThreadDialog(false);
      setNewThreadPatient('');
      setNewThreadSubject('');
      setNewThreadUrgency('normal');
      if (thread) setSelectedThread(thread);
      toast.success('Thread created');
    },
    onError: () => toast.error('Failed to create thread'),
  });

  const closeThreadMutation = useMutation({
    mutationFn: (threadId) => base44.entities.MessageThread.update(threadId, { status: 'closed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      toast.success('Thread closed');
    },
  });

  const getPatientName = (patientRef) => {
    if (!patientRef) return null;
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : null;
  };

  const filteredThreads = threads.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const patientName = getPatientName(t.patient_ref) || '';
    const matchesSearch =
      !searchTerm ||
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const isMyMessage = (msg) =>
    msg.sender_ref === user?.id || msg.sender_name === user?.full_name;

  const handleSend = () => {
    if (!messageBody.trim()) return;
    sendMessageMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Internal Messaging</h1>
          <p className="text-slate-500 text-sm mt-1">Secure staff-to-staff case discussions</p>
        </div>
        <Button onClick={() => setShowNewThreadDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Thread
        </Button>
      </div>

      <div className="h-[calc(100vh-200px)] flex gap-4 min-h-[500px]">
        {/* Thread List */}
        <div className="w-80 flex flex-col gap-2 flex-shrink-0">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search threads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center text-slate-400">
                  <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-sm">No threads found</p>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const urgStyle = URGENCY_STYLES[thread.urgency_flag] || URGENCY_STYLES.normal;
                  const patientName = getPatientName(thread.patient_ref);
                  const isSelected = selectedThread?.id === thread.id;
                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-teal-50 border-teal-300'
                          : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <p className="text-sm font-semibold text-slate-900 truncate flex-1">{thread.subject}</p>
                        {thread.urgency_flag && thread.urgency_flag !== 'normal' && (
                          <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${thread.urgency_flag === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge className={`text-[10px] px-1.5 py-0 ${thread.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {thread.status}
                        </Badge>
                        {thread.urgency_flag && thread.urgency_flag !== 'normal' && (
                          <Badge className={`text-[10px] px-1.5 py-0 ${urgStyle.badge}`}>
                            {urgStyle.label}
                          </Badge>
                        )}
                      </div>

                      {patientName && (
                        <p className="text-xs text-teal-600 font-medium truncate">👤 {patientName}</p>
                      )}

                      {thread.last_message_at && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <CardHeader className="flex-shrink-0 border-b py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{selectedThread.subject}</CardTitle>
                      {selectedThread.urgency_flag && selectedThread.urgency_flag !== 'normal' && (
                        <Badge className={URGENCY_STYLES[selectedThread.urgency_flag]?.badge + ' text-xs'}>
                          {URGENCY_STYLES[selectedThread.urgency_flag]?.label}
                        </Badge>
                      )}
                      <Badge className={selectedThread.status === 'open' ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-slate-100 text-slate-500 text-xs'}>
                        {selectedThread.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {getPatientName(selectedThread.patient_ref) && (
                        <span>👤 Patient: <span className="font-medium text-slate-700">{getPatientName(selectedThread.patient_ref)}</span></span>
                      )}
                      {selectedThread.created_by && (
                        <span>Started by <span className="font-medium">{selectedThread.created_by}</span></span>
                      )}
                    </div>
                  </div>
                  {selectedThread.status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeThreadMutation.mutate(selectedThread.id)}
                      disabled={closeThreadMutation.isPending}
                      className="text-xs"
                    >
                      <X className="w-3 h-3 mr-1" /> Close Thread
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {messages.length === 0 && (
                  <div className="text-center text-sm text-slate-400 py-12">
                    No messages yet. Start the conversation below.
                  </div>
                )}
                {messages.map((msg) => {
                  const mine = isMyMessage(msg);
                  const urgStyle = URGENCY_STYLES[msg.urgency_flag] || URGENCY_STYLES.normal;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${mine ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-white text-slate-900 rounded-bl-sm border'}`}>
                        <p className={`text-xs font-semibold mb-1 ${mine ? 'text-teal-100' : 'text-teal-600'}`}>
                          {msg.sender_name || 'Staff'}
                        </p>
                        {msg.urgency_flag && msg.urgency_flag !== 'normal' && (
                          <div className={`text-xs font-bold mb-1 flex items-center gap-1 ${msg.urgency_flag === 'critical' ? (mine ? 'text-red-200' : 'text-red-600') : (mine ? 'text-amber-200' : 'text-amber-600')}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {urgStyle.label}
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        <p className={`text-[10px] mt-1.5 ${mine ? 'text-teal-200' : 'text-slate-400'}`}>
                          {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Compose */}
              {selectedThread.status === 'open' ? (
                <div className="flex-shrink-0 p-3 border-t bg-white space-y-2">
                  <div className="flex gap-2">
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger className="w-40 h-9 text-xs">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">🟡 Urgent</SelectItem>
                        <SelectItem value="critical">🔴 Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 flex gap-2">
                      <Textarea
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        placeholder="Type message... (Enter to send, Shift+Enter new line)"
                        rows={1}
                        className="resize-none text-sm min-h-[36px] max-h-32"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={sendMessageMutation.isPending || !messageBody.trim()}
                        className="h-9 px-3 bg-teal-600 hover:bg-teal-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-shrink-0 p-3 border-t bg-slate-50 text-center text-sm text-slate-400">
                  This thread is closed.
                </div>
              )}
            </>
          ) : (
            <CardContent className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              <div>
                <p className="font-semibold text-slate-600">Select a conversation</p>
                <p className="text-sm text-slate-400 mt-1">Pick a thread on the left, or create a new one</p>
              </div>
              <Button variant="outline" onClick={() => setShowNewThreadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> New Thread
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Thread Dialog */}
      <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              New Case Discussion Thread
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm">Subject <span className="text-red-500">*</span></Label>
              <Input
                value={newThreadSubject}
                onChange={(e) => setNewThreadSubject(e.target.value)}
                placeholder="e.g. Post-op review for Mr. Silva"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm">Patient (optional)</Label>
              <Select value={newThreadPatient} onValueChange={setNewThreadPatient}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select patient (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No specific patient</SelectItem>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} {p.mrn ? `· ${p.mrn}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Priority</Label>
              <Select value={newThreadUrgency} onValueChange={setNewThreadUrgency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">🟡 Urgent</SelectItem>
                  <SelectItem value="critical">🔴 Critical — Immediate attention needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewThreadDialog(false)}>Cancel</Button>
              <Button
                onClick={() => createThreadMutation.mutate()}
                disabled={createThreadMutation.isPending || !newThreadSubject.trim()}
              >
                Create Thread
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}