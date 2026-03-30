import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import WSChat from './WSChat';

/**
 * Supplier-side message hub — shows all connected buyer pharmacies,
 * lets the supplier open a chat with each buyer.
 */
export default function WSSupplierMessages({ providerId, user }) {
  const [selectedConnection, setSelectedConnection] = useState(null);

  const { data: connections = [] } = useQuery({
    queryKey: ['wsSupplierConnections', providerId],
    queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: providerId, status: 'active' }),
    enabled: !!providerId,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['wsAllSupplierMessages', providerId],
    queryFn: async () => {
      if (connections.length === 0) return [];
      const results = await Promise.all(
        connections.map(c => base44.entities.WholesaleMessage.filter({ connection_id: c.id }))
      );
      return results.flat();
    },
    enabled: connections.length > 0,
    refetchInterval: 8000,
  });

  const getUnread = (connectionId) =>
    allMessages.filter(m => m.connection_id === connectionId && !m.is_read_by_supplier && m.sender_role === 'buyer').length;

  const totalUnread = connections.reduce((sum, c) => sum + getUnread(c.id), 0);

  if (connections.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No active buyer connections</p>
        <p className="text-sm mt-1">Once pharmacies connect to you, you can message them here</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {totalUnread > 0 && (
        <div className="mb-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-sm text-indigo-700 font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          You have {totalUnread} unread message{totalUnread > 1 ? 's' : ''} from buyers
        </div>
      )}

      <div className="flex gap-4 h-[600px]">
        {/* Buyer list */}
        <div className="w-64 shrink-0 space-y-2 overflow-y-auto">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Connected Pharmacies</p>
          {connections.map(c => {
            const unread = getUnread(c.id);
            const lastMsg = allMessages.filter(m => m.connection_id === c.id).slice(-1)[0];
            const isSelected = selectedConnection?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedConnection(c)}
                className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                  isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 truncate">
                    {c.buyer_name || c.buyer_organization_name || 'Pharmacy'}
                  </span>
                  {unread > 0 && (
                    <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 min-w-[18px] flex items-center justify-center">{unread}</Badge>
                  )}
                </div>
                {lastMsg && (
                  <p className="text-xs text-slate-400 mt-1 truncate">{lastMsg.message}</p>
                )}
                <ChevronRight className={`w-3 h-3 ml-auto mt-1 ${isSelected ? 'text-indigo-500' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>

        {/* Chat panel */}
        <div className="flex-1">
          {selectedConnection ? (
            <WSChat
              connection={selectedConnection}
              viewerRole="supplier"
              user={user}
              buyerName={selectedConnection.buyer_name || selectedConnection.buyer_organization_name || 'Pharmacy'}
            />
          ) : (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a pharmacy to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}