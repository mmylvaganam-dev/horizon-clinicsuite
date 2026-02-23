import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, Link } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSMyConnections({ orgId, connections }) {
  const queryClient = useQueryClient();

  const { data: allProviders = [] } = useQuery({
    queryKey: ['wholesaleProviders'],
    queryFn: () => base44.entities.WholesaleProvider.filter({ status: 'active' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.WholesaleConnection.update(id, { status: 'rejected' }),
    onSuccess: () => { queryClient.invalidateQueries(['wsMyConnections', orgId]); toast.success('Request cancelled'); },
  });

  const active = connections.filter(c => c.status === 'active');
  const pending = connections.filter(c => c.status === 'pending');
  const rejected = connections.filter(c => c.status === 'rejected');

  const getProviderInfo = (providerId) => allProviders.find(p => p.id === providerId);

  return (
    <div className="space-y-6 mt-4">
      {active.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Active Suppliers ({active.length})</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {active.map(c => {
              const provider = getProviderInfo(c.provider_id);
              return (
                <Card key={c.id} className="border-2 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{c.provider_name}</p>
                        <p className="text-xs text-slate-500">{provider?.description}</p>
                        {c.credit_limit > 0 && <p className="text-xs text-indigo-600 mt-1">Credit: LKR {c.credit_limit?.toLocaleString()} · {c.payment_terms_days}d terms</p>}
                      </div>
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-600" /> Pending Requests ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(c => (
              <Card key={c.id} className="border-2 border-yellow-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.provider_name}</p>
                    <p className="text-xs text-slate-500">Waiting for {c.initiated_by === 'buyer' ? 'provider approval' : 'your acceptance'}</p>
                  </div>
                  <div className="flex gap-2">
                    {c.initiated_by === 'provider' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={async () => {
                        await base44.entities.WholesaleConnection.update(c.id, { status: 'active' });
                        queryClient.invalidateQueries(['wsMyConnections', orgId]);
                        toast.success('Connection accepted!');
                      }}>Accept</Button>
                    )}
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => cancelMutation.mutate(c.id)}>
                      {c.initiated_by === 'buyer' ? 'Cancel' : 'Reject'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {connections.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Link className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No supplier connections yet</p>
          <p className="text-sm mt-1">Browse the marketplace and request connections to wholesale providers</p>
        </div>
      )}
    </div>
  );
}