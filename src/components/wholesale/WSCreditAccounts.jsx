import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Plus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSCreditAccounts() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { company_id: '', company_name: '', credit_limit: 0, current_balance: 0, payment_terms_days: 30, status: 'active', notes: '' };
  const [form, setForm] = useState(blank);

  const { data: accounts = [] } = useQuery({ queryKey: ['wsCreditAccounts'], queryFn: () => base44.entities.WholesaleCreditAccount.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.CompanyProfile.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, credit_limit: Number(data.credit_limit), current_balance: Number(data.current_balance), payment_terms_days: Number(data.payment_terms_days) };
      return editing ? base44.entities.WholesaleCreditAccount.update(editing.id, payload) : base44.entities.WholesaleCreditAccount.create(payload);
    },
    onSuccess: () => { queryClient.invalidateQueries(['wsCreditAccounts']); setOpen(false); setEditing(null); setForm(blank); toast.success('Credit account saved'); },
  });

  const openEdit = (a) => { setEditing(a); setForm({ company_id: a.company_id, company_name: a.company_name, credit_limit: a.credit_limit || 0, current_balance: a.current_balance || 0, payment_terms_days: a.payment_terms_days || 30, status: a.status, notes: a.notes || '' }); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setForm(blank); setOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Credit Account
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {accounts.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            No credit accounts configured
          </div>
        ) : accounts.map(a => {
          const utilization = a.credit_limit > 0 ? (a.current_balance / a.credit_limit) * 100 : 0;
          return (
            <Card key={a.id} className={`border-2 ${utilization >= 90 ? 'border-red-300' : utilization >= 70 ? 'border-orange-200' : 'border-slate-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{a.company_name}</h3>
                    <Badge className={a.status === 'active' ? 'bg-green-100 text-green-700' : a.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}>{a.status}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit className="w-4 h-4" /></Button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Credit Limit</span>
                    <span className="font-bold">LKR {Number(a.credit_limit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Outstanding</span>
                    <span className={`font-black ${a.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>LKR {Number(a.current_balance).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${utilization >= 90 ? 'bg-red-500' : utilization >= 70 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 text-right">{utilization.toFixed(0)}% utilized · {a.payment_terms_days} day terms</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Credit Account' : 'Add Credit Account'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Company *</Label>
              <Select value={form.company_id} onValueChange={v => { const c = companies.find(co => co.id === v); setForm({...form, company_id: v, company_name: c?.company_legal_name || ''}); }}>
                <SelectTrigger><SelectValue placeholder="Select company..." /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_legal_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Credit Limit (LKR)</Label><Input type="number" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} /></div>
              <div><Label>Current Balance (LKR)</Label><Input type="number" value={form.current_balance} onChange={e => setForm({...form, current_balance: e.target.value})} /></div>
            </div>
            <div><Label>Payment Terms (days)</Label><Input type="number" value={form.payment_terms_days} onChange={e => setForm({...form, payment_terms_days: e.target.value})} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => saveMutation.mutate(form)} disabled={!form.company_id || saveMutation.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}