import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, ChevronDown } from 'lucide-react';

const TOPIC_LABELS = {
  general: { label: 'General', color: 'bg-slate-100 text-slate-700' },
  order_amendment: { label: 'Order Amendment', color: 'bg-orange-100 text-orange-700' },
  stock_enquiry: { label: 'Stock Enquiry', color: 'bg-blue-100 text-blue-700' },
  delivery_query: { label: 'Delivery Query', color: 'bg-purple-100 text-purple-700' },
  payment_query: { label: 'Payment Query', color: 'bg-green-100 text-green-700' },
};

/**
 * WSChat — real-time messaging between a buyer pharmacy and a wholesale supplier.
 *
 * Props:
 *   connection     — WholesaleConnection object (must have id, provider_id, buyer_organization_id, provider_name)
 *   viewerRole     — 'buyer' | 'supplier'  (which side is the current user)
 *   user           — current user object from base44.auth.me()
 *   providerName   — display name of the supplier (optional fallback)
 *   buyerName      — display name of the buyer org (optional fallback)
 */
export default function WSChat({ connection, viewerRole, user, providerName, buyerName }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('general');
  const bottomRef = useRef(null);

  const qKey = ['wsMessages', connection?.id];

  const { data: messages = [] } = useQuery({
    queryKey: qKey,
    queryFn: () => base44.entities.WholesaleMessage.filter(
      { connection_id: connection.id },
      'created_date',
      100
    ),
    enabled: !!connection?.id,
    refetchInterval: 5000, // poll every 5 seconds for real-time feel
  });

  // Mark unread messages as read when opening the chat
  const markReadMutation = useMutation({
    mutationFn: async () => {
      const field = viewerRole === 'buyer' ? 'is_read_by_buyer' : 'is_read_by_supplier';
      const unread = messages.filter(m => !m[field] && m.sender_role !== viewerRole);
      await Promise.all(unread.map(m => base44.entities.WholesaleMessage.update(m.id, { [field]: true })));
    },
  });

  useEffect(() => {
    if (messages.length > 0) markReadMutation.mutate();
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.WholesaleMessage.create({
      connection_id: connection.id,
      provider_id: connection.provider_id,
      buyer_organization_id: connection.buyer_organization_id,
      sender_email: user?.email || '',
      sender_name: user?.full_name || user?.email || 'Unknown',
      sender_role: viewerRole,
      message: text.trim(),
      topic,
      is_read_by_buyer: viewerRole === 'buyer',
      is_read_by_supplier: viewerRole === 'supplier',
    }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries(qKey);
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherParty = viewerRole === 'buyer'
    ? (providerName || connection?.provider_name || 'Supplier')
    : (buyerName || connection?.buyer_name || 'Buyer Pharmacy');

  return (
    <div className="flex flex-col h-full min-h-[480px] max-h-[600px] bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex items-center gap-3">
        <MessageSquare className="w-5 h-5" />
        <div className="flex-1">
          <p className="font-bold text-sm">{otherParty}</p>
          <p className="text-xs text-indigo-200">
            {viewerRole === 'buyer' ? 'Wholesale Supplier' : 'Retail Pharmacy'}
          </p>
        </div>
        <span className="text-xs text-indigo-200">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-12">
            <MessageSquare className="w-10 h-10 opacity-30" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start a conversation about orders, stock, or deliveries</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_role === viewerRole;
          const topicMeta = TOPIC_LABELS[msg.topic] || TOPIC_LABELS.general;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] space-y-1`}>
                <div className={`flex items-center gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs text-slate-400 font-medium">{isMine ? 'You' : msg.sender_name}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${topicMeta.color}`}>{topicMeta.label}</Badge>
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm ${
                  isMine
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                }`}>
                  {msg.message}
                </div>
                <p className={`text-[10px] text-slate-400 ${isMine ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-2">
        {/* Topic selector */}
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(TOPIC_LABELS).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setTopic(key)}
              className={`text-[11px] px-2 py-1 rounded-full font-medium border transition-all ${
                topic === key ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-200'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            rows={2}
            placeholder="Type a message… (Enter to send)"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 self-end h-10 w-10 p-0"
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}