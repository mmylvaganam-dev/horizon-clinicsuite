import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Archive } from 'lucide-react';
import { format } from 'date-fns';

export default function ArchiveStatus({ recordType, recordId }) {
  const { data: archives = [] } = useQuery({
    queryKey: ['archiveStatus', recordType, recordId],
    queryFn: async () => {
      const all = await base44.entities.ArchiveRecord.filter({
        record_type: recordType,
        record_id: recordId
      });
      return all;
    },
    enabled: !!recordType && !!recordId
  });

  if (archives.length === 0) return null;

  const archive = archives[0];

  return (
    <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 flex items-start gap-3">
      <Archive className="w-5 h-5 text-slate-600 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="bg-slate-200 text-slate-700">
            Archived - Read Only
          </Badge>
        </div>
        <p className="text-sm text-slate-700">
          Archived on {format(new Date(archive.archived_at), 'MMM d, yyyy h:mm a')} by {archive.archived_by_email}
        </p>
        {archive.reason && (
          <p className="text-sm text-slate-600 mt-1">Reason: {archive.reason}</p>
        )}
      </div>
    </div>
  );
}