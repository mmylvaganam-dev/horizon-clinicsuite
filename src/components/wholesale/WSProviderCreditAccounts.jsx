import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSProviderCreditAccounts({ provider }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ credit_limit: '', payment_terms_days: 30, notes: '' });

  const { data: connections = [] } = useQuery({
    queryKey: ['wsConnections', provider.id],
    queryFn: () => base44.entities.WholesaleConnection.filter({ provider_id: provider.id, status: 'active' }),
  });

  const { data: creditAccounts = [] } = useQuery({
    queryKey: ['wsCreditAccounts', provider.id],
    queryFn: () => base44.entities.WholesaleCreditAccount.filter({ provider_id: provider.id }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        provider_id: provider.id,
        company_id: editing.buyer_company_id || '',
        company_name: editing.buyer_name,
        credit_limit: Number(form.credit_limit),
        payment_terms_days: Number(form.payment_terms_days),
        notes: form.notes,
        status: 'active',
      };
      const existing = creditAccounts.find(a => a.company_id === editing.buyer_company_id && a.provider_id === provider.id);
      if (existing) return await base44.entities.WholesaleCreditAccount.update(existing.id, data);
      return await base44.entities.WholesaleCreditAccount.create({ ...data, current_balance: 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsCreditAccounts', provider.id]);
      toast.success('Credit account saved!');
      setOpen(false);
    },
  });

  const openEdit = (conn) => {
    setEditing(conn);
    const existing = creditAccounts.find(a => a.company_id === conn.buyer_company_id && a.provider_id === provider.id);
    setForm({ credit_limit: existing?.credit_limit || conn.credit_limit || '', payment_terms_days: existing?.payment_terms_days || conn.payment_terms_days || 30, notes: existing?.notes || '' });
    setOpen(true);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400">No active buyer connections. Connect buyers first.</div>
        ) : connections.map(conn => {
          const account = creditAccounts.find(a => a.company_id === conn.buyer_company_id);
          const utilPct = account?.credit_limit > 0 ? Math.min(100, (account.current_balance / account.credit_limit) * 100) : 0;
          return (
            <Card key={conn.id} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{conn.buyer_name}</p>
                    <Badge className={account ? 'bg-green-100 text-green-700 mt-1' : 'bg-slate-100 text-slate-600 mt-1'}>
                      {account ? 'Credit Set' : 'No Credit Account'}
                    </Badge>
                  </div>
                  <button onClick={() => openEdit(conn)} className="p-1 text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                </div>
                {account ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Credit Limit</span>
                      <span className="font-bold">LKR {account.credit_limit?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Outstanding</span>
                      <span className={`font-bold ${account.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>LKR {account.current_balance?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full mt-2">
                      <div className={`h-2 rounded-full ${utilPct > 80 ? 'bg-red-500' : utilPct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${utilPct}%` }} />
                    </div>
                    <p className="text-xs text-slate-400">{account.payment_terms_days}d payment terms</p>
                  </div>
                ) : (
                  <Button size="sm" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => openEdit(conn)}>
                    <CreditCard className="w-4 h-4 mr-1" /> Set Up Credit
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Credit Account — {editing?.buyer_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div><Label>Credit Limit (LKR)</Label><Input type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} /></div>
            <div><Label>Payment Terms (days)</Label><Input type="number" value={form.payment_terms_days} onChange={e => setForm(f => ({ ...f, payment_terms_days: e.target.value }))} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Credit Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}