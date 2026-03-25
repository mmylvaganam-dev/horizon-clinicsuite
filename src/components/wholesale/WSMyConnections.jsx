import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Clock, Link, DollarSign, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import WSBuyerAccountStatement from './WSBuyerAccountStatement';

export default function WSMyConnections({ orgId, connections }) {
  const queryClient = useQueryClient();
  const [viewingAccount, setViewingAccount] = useState(null); // selected connection

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allProviders = [] } = useQuery({
    queryKey: ['wholesaleProviders'],
    queryFn: () => base44.entities.WholesaleProvider.filter({ status: 'active' }),
  });

  // Load credit accounts for balance display in cards
  const { data: creditAccounts = [] } = useQuery({
    queryKey: ['wsBuyerAllCreditAccts', orgId],
    queryFn: async () => {
      const org = (await base44.entities.Organization.filter({ id: orgId }))[0];
      if (!org?.company_id) return [];
      return base44.entities.WholesaleCreditAccount.filter({ company_id: org.company_id });
    },
    enabled: !!orgId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.WholesaleConnection.update(id, { status: 'rejected' }),
    onSuccess: () => { queryClient.invalidateQueries(['wsMyConnections', orgId]); toast.success('Request cancelled'); },
  });

  const active = connections.filter(c => c.status === 'active');
  const pending = connections.filter(c => c.status === 'pending');
  const getProvider = (providerId) => allProviders.find(p => p.id === providerId);

  return (
    <div className="space-y-6 mt-4">
      {/* Active Suppliers */}
      {active.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" /> Active Suppliers ({active.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {active.map(c => {
              const provider = getProvider(c.provider_id);
              const creditAcct = creditAccounts.find(a => a.provider_id === c.provider_id);
              const outstanding = creditAcct?.current_balance || 0;
              return (
                <Card key={c.id} className="border-2 border-green-200 hover:border-indigo-300 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{c.provider_name}</p>
                        {provider?.description && <p className="text-xs text-slate-500 mt-0.5">{provider.description}</p>}
                        {creditAcct ? (
                          <div className="mt-2 flex gap-3 text-xs">
                            <span className="text-slate-500">Limit: <strong className="text-slate-700">LKR {creditAcct.credit_limit?.toLocaleString()}</strong></span>
                            <span className={outstanding > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                              Due: LKR {outstanding.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          c.credit_limit > 0 && <p className="text-xs text-indigo-600 mt-1">Credit: LKR {c.credit_limit?.toLocaleString()} · {c.payment_terms_days}d terms</p>
                        )}
                      </div>
                      <Badge className="bg-green-100 text-green-700 shrink-0">Active</Badge>
                    </div>

                    {outstanding > 0 && (
                      <div className="mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-xs text-red-700 font-semibold">
                        ⚠️ Outstanding balance: LKR {outstanding.toLocaleString()}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-2"
                      onClick={() => setViewingAccount(c)}
                    >
                      <DollarSign className="w-4 h-4" /> View Account & Pay
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pending.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" /> Pending Requests ({pending.length})
          </h3>
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

      {/* Account Statement Dialog */}
      <Dialog open={!!viewingAccount} onOpenChange={(o) => !o && setViewingAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Statement — {viewingAccount?.provider_name}</DialogTitle>
          </DialogHeader>
          {viewingAccount && (
            <WSBuyerAccountStatement
              connection={viewingAccount}
              orgId={orgId}
              user={user}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}