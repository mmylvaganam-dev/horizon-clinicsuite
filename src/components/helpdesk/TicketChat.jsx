import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, Upload, Lock, User, Bot, Paperclip, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import KBArticleSearch from './KBArticleSearch';

export default function TicketChat({ ticket, currentUser }) {
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['helpdesk_messages', ticket.id],
    queryFn: () => base44.entities.HelpDeskMessage.filter({ ticket_id: ticket.id }, 'created_date'),
    refetchInterval: 8000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const msg = await base44.entities.HelpDeskMessage.create({
        ticket_id: ticket.id,
        sender_email: currentUser?.email || 'anonymous',
        sender_name: currentUser?.full_name || currentUser?.email || 'User',
        sender_type: 'staff',
        message,
        attachment_urls: attachments,
        is_internal: isInternal
      });
      if (!isInternal) {
        base44.functions.invoke('helpdeskNotify', {
          event: 'new_message',
          ticket,
          message: msg,
          senderName: currentUser?.full_name || currentUser?.email
        }).catch(() => {});
      }
      return msg;
    },
    onSuccess: () => {
      setMessage('');
      setAttachments([]);
      queryClient.invalidateQueries(['helpdesk_messages', ticket.id]);
    },
    onError: () => toast.error('Failed to send message')
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const f of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        urls.push(file_url);
      }
      setAttachments(a => [...a, ...urls]);
      toast.success('Attached');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const handleSend = () => {
    if (!message.trim() && !attachments.length) return;
    sendMutation.mutate();
  };

  const bubbleColor = (msg) => {
    if (msg.sender_type === 'system') return 'bg-slate-100 text-slate-500 text-xs italic';
    if (msg.is_internal) return 'bg-amber-50 border border-amber-200 text-amber-900';
    if (msg.sender_email === currentUser?.email) return 'bg-teal-600 text-white ml-auto';
    return 'bg-white border border-slate-200 text-slate-800';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0" style={{ maxHeight: '420px' }}>
        {messages.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.sender_email === currentUser?.email ? 'ml-auto items-end' : 'items-start'}`}>
            <div className={`rounded-xl px-3 py-2 text-sm ${bubbleColor(msg)}`}>
              {msg.is_internal && (
                <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                  <Lock className="w-3 h-3" /> Internal note
                </div>
              )}
              <p>{msg.message}</p>
              {msg.attachment_urls?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {msg.attachment_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs underline flex items-center gap-1 opacity-80">
                      <Paperclip className="w-3 h-3" />Attachment {i+1}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 px-1">
              {msg.sender_name} · {format(new Date(msg.created_date), 'HH:mm')}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t p-3 bg-slate-50 space-y-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {attachments.map((_, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                File {i+1}
                <button className="ml-1" onClick={() => setAttachments(a => a.filter((_,j) => j!==i))}>×</button>
              </Badge>
            ))}
          </div>
        )}
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type a message..."
          rows={2}
          className="resize-none"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="file" multiple id="chat-upload" className="hidden" onChange={handleUpload} />
            <label htmlFor="chat-upload">
              <Button type="button" variant="ghost" size="sm" disabled={uploading} asChild>
                <span className="cursor-pointer"><Upload className="w-4 h-4" /></span>
              </Button>
            </label>
            <div className="flex items-center gap-1.5">
              <Switch id="internal" checked={isInternal} onCheckedChange={setIsInternal} />
              <Label htmlFor="internal" className="text-xs text-amber-600 cursor-pointer">Internal note</Label>
            </div>
          </div>
          <Button size="sm" onClick={handleSend} disabled={sendMutation.isPending || (!message.trim() && !attachments.length)} className="bg-teal-600 hover:bg-teal-700">
            <Send className="w-4 h-4 mr-1" />Send
          </Button>
        </div>
      </div>
    </div>
  );
}