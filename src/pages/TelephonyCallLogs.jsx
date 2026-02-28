import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import TelephonyModuleGate from '@/components/telephony/TelephonyModuleGate';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, Clock, PhoneCall } from 'lucide-react';
import { format } from 'date-fns';

const DISPOSITION_CONFIG = {
  answered: { icon: PhoneCall, color: 'bg-green-100 text-green-700', label: 'Answered' },
  missed: { icon: PhoneMissed, color: 'bg-red-100 text-red-700', label: 'Missed' },
  voicemail: { icon: PhoneIncoming, color: 'bg-amber-100 text-amber-700', label: 'Voicemail' },
  busy: { icon: PhoneOff, color: 'bg-orange-100 text-orange-700', label: 'Busy' },
  failed: { icon: PhoneOff, color: 'bg-slate-100 text-slate-700', label: 'Failed' },
};

function formatDuration(secs) {
  if (!secs) return '--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function TelephonyCallLogs() {
  const { selectedOrgId } = useOrganization();
  const [dirFilter, setDirFilter] = useState('all');
  const [dispFilter, setDispFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['callLogs', selectedOrgId, dirFilter, dispFilter],
    queryFn: async () => {
      const filters = {};
      if (dirFilter !== 'all') filters.direction = dirFilter;
      if (dispFilter !== 'all') filters.disposition = dispFilter;
      const res = await base44.functions.invoke('telephonyCallLogs', {
        action: 'list', org_id: selectedOrgId, filters
      });
      return res.data.items || [];
    },
    enabled: !!selectedOrgId,
  });

  return (
    <TelephonyModuleGate>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
              <p className="text-sm text-slate-500">Recent call history for this organization</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={dirFilter} onValueChange={setDirFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Direction" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dispFilter} onValueChange={setDispFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Disposition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dispositions</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        )}

        {!isLoading && (logs || []).length === 0 && (
          <Card><CardContent className="flex flex-col items-center py-12 text-center">
            <PhoneCall className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No call logs found</p>
            <p className="text-slate-400 text-sm">Call records will appear here once the PBX is connected.</p>
          </CardContent></Card>
        )}

        <div className="space-y-2">
          {(logs || []).map(log => {
            const disp = DISPOSITION_CONFIG[log.disposition] || DISPOSITION_CONFIG.failed;
            const DispIcon = disp.icon;
            const DirIcon = log.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
            return (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 p-3">
                  <DirIcon className={`w-4 h-4 flex-shrink-0 ${log.direction === 'inbound' ? 'text-blue-500' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <p className="text-xs text-slate-400">From</p>
                      <p className="font-mono text-sm font-medium text-slate-800">{log.from_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">To</p>
                      <p className="font-mono text-sm font-medium text-slate-800">{log.to_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Time</p>
                      <p className="text-sm text-slate-600">
                        {log.started_at ? format(new Date(log.started_at), 'MMM d, HH:mm') : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Duration</p>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(log.duration_seconds)}
                      </p>
                    </div>
                  </div>
                  <Badge className={`text-xs flex items-center gap-1 ${disp.color}`}>
                    <DispIcon className="w-3 h-3" /> {disp.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </TelephonyModuleGate>
  );
}