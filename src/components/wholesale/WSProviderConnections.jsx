import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, CheckCircle, XCircle, PlusCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSProviderConnections({ provider }) {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(30);

  const { data: connections = [] } = useQuery({
    queryKey: ['wsConnections', provider.id],
    queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: provider.id }),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }) => base44.entities.WholesaleConnection.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries(['wsConnections', provider.id]); toast.success('Connection updated!'); },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const org = organizations.find(o => o.id === inviteOrgId);
      const existing = connections.find(c => c.buyer_organization_id === inviteOrgId);
      if (existing) throw new Error('Connection already exists for this organization');
      return await base44.entities.WholesaleConnection.create({
        provider_id: provider.id,
        provider_name: provider.company_name,
        buyer_organization_id: inviteOrgId,
        buyer_company_id: org?.company_id || '',
        buyer_name: org?.name || '',
        status: 'pending',
        initiated_by: 'provider',
        credit_limit: Number(creditLimit) || 0,
        payment_terms_days: Number(paymentTerms) || 30,
        current_balance: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsConnections', provider.id]);
      toast.success('Invite sent to buyer!');
      setInviteOpen(false);
      setInviteOrgId('');
      setCreditLimit('');
    },
    onError: (e) => toast.error(e.message),
  });

  const pending = connections.filter(c => c.status === 'pending');
  const active = connections.filter(c => c.status === 'active');
  const suspended = connections.filter(c => c.status === 'suspended');

  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-end">
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setInviteOpen(true)}>
          <Send className="w-4 h-4 mr-2" /> Invite Buyer
        </Button>
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Pending ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(c => (
              <Card key={c.id} className="border-2 border-yellow-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.buyer_name}</p>
                    <p className="text-xs text-slate-500">Initiated by: {c.initiated_by}</p>
                  </div>
                  {c.initiated_by === 'buyer' && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ id: c.id, status: 'active' })}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ id: c.id, status: 'rejected' })}>
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {c.initiated_by === 'provider' && (
                    <Badge className="bg-yellow-100 text-yellow-700">Awaiting buyer acceptance</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Active Buyers ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No active buyers yet</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {active.map(c => (
              <Card key={c.id} className="border-2 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{c.buyer_name}</p>
                      {c.credit_limit > 0 && <p className="text-xs text-slate-500">Credit: LKR {c.credit_limit?.toLocaleString()} · {c.payment_terms_days}d terms</p>}
                    </div>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => updateMutation.mutate({ id: c.id, status: 'suspended' })}>
                      Suspend
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {suspended.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-700 mb-3">Suspended ({suspended.length})</h3>
          {suspended.map(c => (
            <Card key={c.id} className="border border-slate-200 mb-2">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="font-semibold text-slate-700">{c.buyer_name}</p>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ id: c.id, status: 'active' })}>Re-activate</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Buyer / Retail Pharmacy</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div>
              <Label>Select Organization</Label>
              <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={inviteOrgId} onChange={e => setInviteOrgId(e.target.value)}>
                <option value="">-- Choose pharmacy / organization --</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Credit Limit (LKR)</Label><Input type="number" placeholder="0" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} /></div>
              <div><Label>Payment Terms (days)</Label><Input type="number" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} /></div>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => inviteMutation.mutate()} disabled={!inviteOrgId || inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending...' : '📨 Send Invite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}