import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { formatSL } from '@/components/utils/dateUtils';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';

const statusColors = {
  pending: 'bg-slate-100 text-slate-700',
  parsed: 'bg-blue-100 text-blue-700',
  matched: 'bg-purple-100 text-purple-700',
  applied: 'bg-green-100 text-green-700',
  rejected: 'bg-rose-100 text-rose-700'
};

export default function LISAnalyzerInbox() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();

  const { data: messages = [] } = useQuery({
    queryKey: ['analyzerInbox', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerInbox.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const { data: analyzers = [] } = useQuery({
    queryKey: ['analyzers', selectedOrgId],
    queryFn: () => base44.entities.AnalyzerRegistry.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analyzer Inbox</h1>
        <p className="text-slate-500 mt-1">Incoming analyzer messages and result integration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Analyzer Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No analyzer messages yet</p>
          ) : (
            <div className="space-y-2">
              {messages.map(message => {
                const analyzer = analyzers.find(a => a.id === message.analyzer_id);
                return (
                  <div key={message.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-slate-900">
                            {analyzer?.analyzer_name || 'Unknown Analyzer'}
                          </p>
                          <Badge variant="outline">{message.message_type}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          {message.specimen_id ? `Specimen: ${message.specimen_id}` : 'No specimen matched'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Received: {formatSL(new Date(message.received_at), 'MMM d, yyyy h:mm a')}
                        </p>
                        {message.rejection_reason && (
                          <div className="mt-2 p-2 bg-rose-50 rounded border border-rose-200">
                            <p className="text-sm text-rose-800">
                              <span className="font-semibold">Rejected:</span> {message.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                      <Badge className={statusColors[message.status]}>
                        {message.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}