import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Plus, AlertTriangle, MessageSquare, X, Clock, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const URGENCY_STYLES = {
  normal: { label: 'Normal', badge: 'bg-slate-100 text-slate-700', bubble: 'bg-teal-500 text-white' },
  urgent: { label: '🟡 Urgent', badge: 'bg-amber-100 text-amber-700', bubble: 'bg-amber-500 text-white' },
  critical: { label: '🔴 Critical', badge: 'bg-red-100 text-red-700', bubble: 'bg-red-500 text-white' },
};

export default function PatientCaseChat({ patientId, patientName }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messageBody, setMessageBody] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [showNewThread, setShowNewThread] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newUrgency, setNewUrgency] = useState('normal');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // All threads for this patient
  const { data: threads = [] } = useQuery({
    queryKey: ['caseThreads', patientId],
    queryFn: () => base44.entities.MessageThread.filter({ patient_ref: patientId }, '-last_message_at'),
    refetchInterval: 15000,
  });

  // Messages in selected thread
  const { data: messages = [] } = useQuery({
    queryKey: ['caseMessages', selectedThreadId],
    queryFn: () => base44.entities.Message.filter({ thread_id: selectedThreadId }, 'created_at'),
    enabled: !!selectedThreadId,
    refetchInterval: 10000,
  });

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  // Auto-select first open thread
  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId) {
      const open = threads.find(t => t.status === 'open') || threads[0];
      setSelectedThreadId(open.id);
    }
  }, [threads, selectedThreadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!messageBody.trim()) return;
      await base44.entities.Message.create({
        thread_id: selectedThreadId,
        sender_type: 'staff',
        sender_ref: user?.id || '',
        sender_name: user?.full_name || user?.email || 'Staff',
        body: messageBody.trim(),
        urgency_flag: urgency,
        created_at: new Date().toISOString(),
      });
      await base44.entities.MessageThread.update(selectedThreadId, {
        last_message_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseMessages', selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ['caseThreads', patientId] });
      setMessageBody('');
      setUrgency('normal');
    },
    onError: () => toast.error('Failed to send message'),
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim()) return;
      const thread = await base44.entities.MessageThread.create({
        patient_ref: patientId,
        subject: newSubject.trim(),
        status: 'open',
        thread_type: 'case_discussion',
        urgency_flag: newUrgency,
        created_by: user?.email || '',
        last_message_at: new Date().toISOString(),
      });
      return thread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['caseThreads', patientId] });
      setShowNewThread(false);
      setNewSubject('');
      setNewUrgency('normal');
      if (thread) setSelectedThreadId(thread.id);
      toast.success('Case thread created');
    },
    onError: () => toast.error('Failed to create thread'),
  });

  const closeThreadMutation = useMutation({
    mutationFn: (threadId) => base44.entities.MessageThread.update(threadId, { status: 'closed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseThreads', patientId] });
      toast.success('Thread closed');
    },
  });

  const handleSend = () => {
    if (!messageBody.trim()) return;
    sendMutation.mutate();
  };

  const isMyMessage = (msg) =>
    msg.sender_ref === user?.id || msg.sender_name === user?.full_name || msg.created_by === user?.email;

  return (
    <div className="flex h-[600px] gap-0 border rounded-xl overflow-hidden bg-white">
      {/* Thread sidebar */}
      <div className="w-64 border-r flex flex-col bg-slate-50 flex-shrink-0">
        <div className="p-3 border-b bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-slate-800">Case Threads</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowNewThread(true)} className="h-7 w-7 p-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showNewThread && (
          <div className="p-3 border-b bg-teal-50 space-y-2">
            <Input
              placeholder="Thread subject..."
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="text-sm h-8"
              autoFocus
            />
            <Select value={newUrgency} onValueChange={setNewUrgency}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">🟡 Urgent</SelectItem>
                <SelectItem value="critical">🔴 Critical</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => createThreadMutation.mutate()} disabled={createThreadMutation.isPending}>
                Create
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowNewThread(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 mt-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No threads yet.<br />Start a case discussion.
            </div>
          ) : (
            threads.map((thread) => {
              const urgStyle = URGENCY_STYLES[thread.urgency_flag] || URGENCY_STYLES.normal;
              const isSelected = thread.id === selectedThreadId;
              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left px-3 py-3 border-b transition-colors ${
                    isSelected ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-xs font-semibold text-slate-800 truncate flex-1">{thread.subject}</p>
                    {thread.urgency_flag && thread.urgency_flag !== 'normal' && (
                      <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${thread.urgency_flag === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className={`text-[10px] px-1.5 py-0 ${thread.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {thread.status}
                    </Badge>
                  </div>
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
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 border-b bg-white flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 text-sm">{selectedThread.subject}</p>
                  {selectedThread.urgency_flag && selectedThread.urgency_flag !== 'normal' && (
                    <Badge className={URGENCY_STYLES[selectedThread.urgency_flag]?.badge + ' text-xs'}>
                      {URGENCY_STYLES[selectedThread.urgency_flag]?.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patient: <span className="font-medium text-slate-700">{patientName}</span>
                  {selectedThread.created_by && <span> · Started by {selectedThread.created_by}</span>}
                </p>
              </div>
              {selectedThread.status === 'open' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => closeThreadMutation.mutate(selectedThread.id)}
                  disabled={closeThreadMutation.isPending}
                >
                  <X className="w-3 h-3 mr-1" /> Close
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-8">
                  No messages yet. Start the discussion.
                </div>
              )}
              {messages.map((msg) => {
                const mine = isMyMessage(msg);
                const urgStyle = URGENCY_STYLES[msg.urgency_flag] || URGENCY_STYLES.normal;
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${mine ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-white text-slate-900 rounded-bl-sm border'}`}>
                      <p className={`text-[11px] font-semibold mb-1 ${mine ? 'text-teal-100' : 'text-teal-600'}`}>
                        {msg.sender_name || 'Staff'}
                      </p>
                      {msg.urgency_flag && msg.urgency_flag !== 'normal' && (
                        <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${msg.urgency_flag === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
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
            </div>

            {/* Input */}
            {selectedThread.status === 'open' ? (
              <div className="p-3 border-t bg-white flex-shrink-0 space-y-2">
                <div className="flex gap-2">
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="w-36 h-9 text-xs">
                      <SelectValue />
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
                      placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                      rows={1}
                      className="resize-none text-sm min-h-[36px] max-h-24"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={sendMutation.isPending || !messageBody.trim()}
                      className="h-9 px-3 bg-teal-600 hover:bg-teal-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 border-t bg-slate-50 text-center text-sm text-slate-400 flex-shrink-0">
                This thread is closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-3">
            <MessageSquare className="w-10 h-10 text-slate-300" />
            <div>
              <p className="font-medium text-slate-600">No thread selected</p>
              <p className="text-sm">Select a thread or create a new case discussion</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowNewThread(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Thread
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}