import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function LinkedRecords({ recordType, recordId }) {
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['recordLinks', recordType, recordId],
    queryFn: async () => {
      const allLinks = await base44.entities.RecordLink.list();
      return allLinks.filter(link => 
        (link.left_type === recordType && link.left_id === recordId) ||
        (link.right_type === recordType && link.right_id === recordId)
      );
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading linked records...
        </div>
      </Card>
    );
  }

  if (links.length === 0) {
    return null;
  }

  const getPageForRecordType = (type) => {
    const mapping = {
      'Invoice': 'Billing',
      'PharmacySale': 'PharmacyPOS',
      'Prescription': 'MedicalRecords',
      'DispenseEvent': 'PharmacyPOS',
      'Order': 'OrdersResults',
      'Result': 'OrdersResults',
      'Appointment': 'Appointments',
      'Encounter': 'MedicalRecords'
    };
    return mapping[type] || 'Dashboard';
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Linked Records</h3>
      <div className="space-y-2">
        {links.map((link) => {
          const isLeft = link.left_type === recordType && link.left_id === recordId;
          const linkedType = isLeft ? link.right_type : link.left_type;
          const linkedId = isLeft ? link.right_id : link.left_id;
          const purpose = link.link_purpose || 'related';

          return (
            <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{linkedType}</Badge>
                  <span className="text-sm text-slate-600">{purpose.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">ID: {linkedId}</p>
                {link.created_at && (
                  <p className="text-xs text-slate-400">
                    {format(new Date(link.created_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <Link 
                to={createPageUrl(getPageForRecordType(linkedType))} 
                className="text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
}