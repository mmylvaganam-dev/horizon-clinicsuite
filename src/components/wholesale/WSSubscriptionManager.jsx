import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Plus, CheckCircle, XCircle, Pencil, Package, Users, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const PLANS = {
  starter:      { name: 'Starter',      price: 15000,  max_products: 100, max_buyers: 5,  color: 'bg-slate-100 text-slate-700', description: 'Up to 100 products, 5 buyers' },
  professional: { name: 'Professional', price: 35000,  max_products: 500, max_buyers: 20, color: 'bg-indigo-100 text-indigo-700', description: 'Up to 500 products, 20 buyers' },
  enterprise:   { name: 'Enterprise',   price: 75000,  max_products: 9999, max_buyers: 999, color: 'bg-purple-100 text-purple-700', description: 'Unlimited products & buyers' },
};

const STATUS_COLOR = { active: 'bg-green-100 text-green-700', trial: 'bg-yellow-100 text-yellow-700', suspended: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-600' };

export default function WSSubscriptionManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ provider_id: '', plan_name: 'professional', billing_cycle: 'monthly', monthly_fee: '', start_date: new Date().toISOString().slice(0, 10), trial_ends_date: '', notes: '' });

  const { data: providers = [] } = useQuery({
    queryKey: ['wholesaleProviders'],
    queryFn: async () => {
      const all = await base44.entities.WholesaleProvider.list();
      return all.filter(p => p.company_code && p.company_name);
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['wsSubscriptions'],
    queryFn: () => base44.entities.WholesaleSubscription.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const provider = providers.find(p => p.id === form.provider_id);
      const plan = PLANS[form.plan_name];
      const data = {
        provider_id: form.provider_id,
        provider_name: provider?.company_name || '',
        plan_name: form.plan_name,
        billing_cycle: form.billing_cycle,
        monthly_fee: Number(form.monthly_fee) || plan.price,
        start_date: form.start_date,
        trial_ends_date: form.trial_ends_date || undefined,
        status: form.trial_ends_date ? 'trial' : 'active',
        max_products: plan.max_products,
        max_buyers: plan.max_buyers,
        notes: form.notes,
        next_billing_date: getNextBillingDate(form.start_date, form.billing_cycle),
      };
      if (editing) return await base44.entities.WholesaleSubscription.update(editing.id, data);
      const existing = subscriptions.find(s => s.provider_id === form.provider_id);
      if (existing && !editing) throw new Error('This provider already has a subscription. Edit the existing one.');
      return await base44.entities.WholesaleSubscription.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsSubscriptions']);
      toast.success(editing ? 'Subscription updated!' : 'Subscription created!');
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => base44.entities.WholesaleSubscription.update(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries(['wsSubscriptions']);
      toast.success(`Subscription ${status}!`);
    },
  });

  const getNextBillingDate = (startDate, cycle) => {
    const d = new Date(startDate);
    if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  const resetForm = () => setForm({ provider_id: '', plan_name: 'professional', billing_cycle: 'monthly', monthly_fee: '', start_date: new Date().toISOString().slice(0, 10), trial_ends_date: '', notes: '' });

  const openEdit = (sub) => {
    setEditing(sub);
    setForm({ provider_id: sub.provider_id, plan_name: sub.plan_name, billing_cycle: sub.billing_cycle, monthly_fee: sub.monthly_fee, start_date: sub.start_date, trial_ends_date: sub.trial_ends_date || '', notes: sub.notes || '' });
    setOpen(true);
  };

  const totalMonthlyRevenue = subscriptions.filter(s => s.status === 'active').reduce((s, sub) => s + (sub.monthly_fee || 0), 0);

  return (
    <div className="space-y-6">
      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-700">Monthly Recurring Revenue</p>
            <p className="font-black text-2xl text-green-800">LKR {totalMonthlyRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-indigo-200 bg-indigo-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-indigo-700">Active Subscriptions</p>
            <p className="font-black text-2xl text-indigo-800">{subscriptions.filter(s => s.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-yellow-700">Trial / Pending</p>
            <p className="font-black text-2xl text-yellow-800">{subscriptions.filter(s => s.status === 'trial').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => {
          const count = subscriptions.filter(s => s.plan_name === key && s.status === 'active').length;
          return (
            <Card key={key} className="border-2">
              <CardContent className="p-4">
                <Badge className={plan.color + ' mb-2'}>{plan.name}</Badge>
                <p className="font-black text-xl text-slate-800">LKR {plan.price.toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span></p>
                <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                <p className="text-sm font-semibold text-indigo-700 mt-2">{count} active subscriber{count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-900">All Wholesale Company Subscriptions</h3>
        <Button className="bg-slate-800 hover:bg-slate-900" onClick={() => { setEditing(null); resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No subscriptions yet. Create a subscription for each wholesale company.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map(sub => {
            const plan = PLANS[sub.plan_name];
            return (
              <Card key={sub.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{sub.provider_name}</p>
                        <Badge className={STATUS_COLOR[sub.status]}>{sub.status}</Badge>
                        <Badge className={plan?.color || 'bg-slate-100 text-slate-600'}>{sub.plan_name}</Badge>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> LKR {sub.monthly_fee?.toLocaleString()}/{sub.billing_cycle === 'annual' ? 'yr' : 'mo'}</span>
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {sub.max_products === 9999 ? 'Unlimited' : sub.max_products} products</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {sub.max_buyers === 999 ? 'Unlimited' : sub.max_buyers} buyers</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Started: {sub.start_date}
                        {sub.next_billing_date && ` · Next billing: ${sub.next_billing_date}`}
                        {sub.trial_ends_date && ` · Trial ends: ${sub.trial_ends_date}`}
                      </p>
                      {sub.notes && <p className="text-xs text-slate-400 italic">{sub.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(sub)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                      {sub.status === 'active' || sub.status === 'trial' ? (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => toggleStatusMutation.mutate({ id: sub.id, status: 'suspended' })}>
                          <XCircle className="w-3 h-3 mr-1" /> Suspend
                        </Button>
                      ) : sub.status === 'suspended' ? (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => toggleStatusMutation.mutate({ id: sub.id, status: 'active' })}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Reactivate
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Subscription' : 'New Wholesale Subscription'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label>Wholesale Company *</Label>
              <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))} disabled={!!editing}>
                <option value="">-- Select provider --</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.company_name} ({p.company_code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plan *</Label>
                <Select value={form.plan_name} onValueChange={v => setForm(f => ({ ...f, plan_name: v, monthly_fee: PLANS[v]?.price || '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANS).map(([k, p]) => <SelectItem key={k} value={k}>{p.name} — LKR {p.price.toLocaleString()}/mo</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Cycle</Label>
                <Select value={form.billing_cycle} onValueChange={v => setForm(f => ({ ...f, billing_cycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Monthly Fee (LKR)</Label><Input type="number" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>Trial Ends Date</Label><Input type="date" value={form.trial_ends_date} onChange={e => setForm(f => ({ ...f, trial_ends_date: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full bg-slate-800 hover:bg-slate-900" onClick={() => saveMutation.mutate()} disabled={!form.provider_id || !form.start_date || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editing ? 'Update Subscription' : 'Create Subscription'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}