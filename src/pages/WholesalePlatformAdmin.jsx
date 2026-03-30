import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Users, CheckCircle, XCircle, Lock, Package, Link, Truck, CreditCard, AlertTriangle, Star } from 'lucide-react';
import WSSubscriptionManager from '@/components/wholesale/WSSubscriptionManager.jsx';
import toast from 'react-hot-toast';
import { useOrganization } from '@/components/OrganizationProvider';

export default function WholesalePlatformAdmin() {
  const queryClient = useQueryClient();
  const { isDefinitelyPlatformOwner } = useOrganization();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: '', company_code: '', description: '', email: '', phone: '', address: '', admin_emails: '', payment_terms_days: '30' });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const isAdmin = isDefinitelyPlatformOwner || user?.role === 'admin';

  const { data: providers = [] } = useQuery({
    queryKey: ['wholesaleProviders'],
    queryFn: async () => {
      const all = await base44.entities.WholesaleProvider.list();
      // Only show genuine wholesale providers (must have company_code)
      return all.filter(p => p.company_code && p.company_name);
    },
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['wholesaleConnections'],
    queryFn: () => base44.entities.WholesaleConnection.list(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.filter({ status: 'active' }),
  });

  if (user && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-900">Platform Owner Only</h2>
        <p className="text-slate-500">Only platform owners and admins can manage wholesale suppliers.</p>
      </div>
    );
  }

  const createProviderMutation = useMutation({
    mutationFn: async () => {
      if (!form.company_name || !form.company_code) throw new Error('Company name and code are required');
      return await base44.entities.WholesaleProvider.create({
        ...form,
        payment_terms_days: parseInt(form.payment_terms_days) || 30,
        admin_emails: form.admin_emails.split(',').map(e => e.trim()).filter(Boolean),
        status: 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesaleProviders'] });
      toast.success('Wholesale supplier created!');
      setOpen(false);
      setForm({ company_name: '', company_code: '', description: '', email: '', phone: '', address: '', admin_emails: '', payment_terms_days: '30' });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await base44.entities.WholesaleConnection.update(id, { status, approved_by: user?.email, approved_date: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesaleConnections'] });
      toast.success('Connection updated!');
    },
  });

  const linkConnectionMutation = useMutation({
    mutationFn: async ({ provider_id, buyer_organization_id }) => {
      const provider = providers.find(p => p.id === provider_id);
      const org = organizations.find(o => o.id === buyer_organization_id);
      const existing = connections.find(c => c.provider_id === provider_id && c.buyer_organization_id === buyer_organization_id);
      if (existing) throw new Error('This pharmacy is already connected to that supplier');
      return await base44.entities.WholesaleConnection.create({
        provider_id,
        provider_name: provider?.company_name || '',
        buyer_organization_id,
        buyer_company_id: org?.company_id || '',
        buyer_name: org?.name || '',
        status: 'active',
        initiated_by: 'platform_admin',
        approved_by: user?.email,
        approved_date: new Date().toISOString(),
        credit_limit: 0,
        current_balance: 0,
        payment_terms_days: provider?.payment_terms_days || 30,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesaleConnections'] });
      toast.success('Retail pharmacy linked to supplier!');
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingConnections = connections.filter(c => c.status === 'pending');
  const activeConnections = connections.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Wholesale Pharma Admin</h1>
              <p className="text-slate-400 text-sm">Manage wholesale suppliers · Connect retail pharmacies · Track all supply chain activity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-slate-400">Suppliers</p>
              <p className="font-black text-xl">{providers.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-slate-400">Active Links</p>
              <p className="font-black text-xl text-green-400">{activeConnections.length}</p>
            </div>
            {pendingConnections.length > 0 && (
              <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-yellow-300">Pending</p>
                <p className="font-black text-xl text-yellow-300">{pendingConnections.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList className="bg-white border-2 border-slate-200 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" /> Wholesale Suppliers ({providers.length})
          </TabsTrigger>
          <TabsTrigger value="link" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Link className="w-4 h-4" /> Connect Pharmacy
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Active Links ({activeConnections.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Pending Approvals
            {pendingConnections.length > 0 && <Badge className="bg-yellow-500 text-white ml-1">{pendingConnections.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Star className="w-4 h-4" /> Subscriptions
          </TabsTrigger>
        </TabsList>

        {/* All Suppliers */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-800 hover:bg-slate-900">
                  <Plus className="w-4 h-4 mr-2" /> Add Wholesale Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Wholesale Supplier</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. MedX Wholesale" /></div>
                    <div><Label>Short Code *</Label><Input placeholder="e.g. MEDX" value={form.company_code} onChange={e => setForm(f => ({ ...f, company_code: e.target.value.toUpperCase() }))} /></div>
                  </div>
                  <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Medicines, surgical supplies..." /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  </div>
                  <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                  <div>
                    <Label>Payment Terms (days)</Label>
                    <Input type="number" value={form.payment_terms_days} onChange={e => setForm(f => ({ ...f, payment_terms_days: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Supplier Admin Emails (comma-separated)</Label>
                    <Input placeholder="admin@supplier.com, manager@supplier.com" value={form.admin_emails} onChange={e => setForm(f => ({ ...f, admin_emails: e.target.value }))} />
                    <p className="text-xs text-slate-500 mt-1">These users will access the Supplier Portal to manage products, orders and payments</p>
                  </div>
                  <Button className="w-full bg-slate-800 hover:bg-slate-900" onClick={() => createProviderMutation.mutate()} disabled={!form.company_name || !form.company_code || createProviderMutation.isPending}>
                    {createProviderMutation.isPending ? 'Creating...' : 'Create Supplier'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {providers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No wholesale suppliers yet</p>
              <p className="text-sm text-slate-400 mt-1">Add your first wholesale supplier to get started</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map(p => {
                const connCount = connections.filter(c => c.provider_id === p.id && c.status === 'active').length;
                return (
                  <Card key={p.id} className="border-2 hover:border-slate-400 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900">{p.company_name}</h3>
                          </div>
                          <Badge variant="outline" className="text-xs font-mono">{p.company_code}</Badge>
                        </div>
                        <Badge className={p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">{p.description}</p>
                      <p className="text-xs text-slate-400 mt-1">{p.email} {p.phone && `· ${p.phone}`}</p>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-teal-700 font-semibold text-sm">
                          <Building2 className="w-4 h-4" />
                          <span>{connCount} retail buyer{connCount !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="text-xs text-slate-400">Net {p.payment_terms_days || 30} days</span>
                      </div>
                      {p.admin_emails?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.admin_emails.slice(0, 2).map(e => (
                            <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                          ))}
                          {p.admin_emails.length > 2 && <Badge variant="outline" className="text-xs">+{p.admin_emails.length - 2} more</Badge>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Connect Pharmacy to Supplier */}
        <TabsContent value="link" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-teal-600" />
                Connect Retail Pharmacy to Wholesale Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">Once connected, the retail pharmacy can browse the supplier's catalog and place orders directly. The supplier will see them as an approved buyer.</p>
              </div>
              <ManualLinkForm providers={providers} organizations={organizations} onLink={(data) => linkConnectionMutation.mutate(data)} loading={linkConnectionMutation.isPending} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Connections */}
        <TabsContent value="active" className="mt-4">
          {activeConnections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No active connections yet. Use "Connect Pharmacy" to link a retail pharmacy to a supplier.</div>
          ) : (
            <div className="space-y-3">
              {activeConnections.map(c => (
                <Card key={c.id} className="border border-slate-200">
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">{c.buyer_name}</span>
                        <span className="text-slate-400 text-sm">→</span>
                        <span className="font-semibold text-indigo-700">{c.provider_name}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Linked by: {c.initiated_by} {c.approved_by && `· Approved by ${c.approved_by}`}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.credit_limit > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Credit Limit</p>
                          <p className="text-sm font-bold text-slate-700">LKR {c.credit_limit?.toLocaleString()}</p>
                        </div>
                      )}
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateConnectionMutation.mutate({ id: c.id, status: 'rejected' })}>
                        <XCircle className="w-3 h-3 mr-1" /> Revoke
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions" className="mt-4">
          <WSSubscriptionManager />
        </TabsContent>

        {/* Pending Approvals */}
        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingConnections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No pending connection requests</div>
          ) : pendingConnections.map(c => (
            <Card key={c.id} className="border-2 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{c.buyer_name} → {c.provider_name}</p>
                    <p className="text-xs text-slate-500 mt-1">Requested by: {c.initiated_by}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateConnectionMutation.mutate({ id: c.id, status: 'active' })}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateConnectionMutation.mutate({ id: c.id, status: 'rejected' })}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManualLinkForm({ providers, organizations, onLink, loading }) {
  const [providerId, setProviderId] = useState('');
  const [orgId, setOrgId] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <Label>Select Wholesale Supplier *</Label>
        <Select value={providerId} onValueChange={setProviderId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Choose a wholesale supplier..." />
          </SelectTrigger>
          <SelectContent>
            {providers.filter(p => p.status === 'active').map(p => (
              <SelectItem key={p.id} value={p.id}>{p.company_name} ({p.company_code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Select Retail Pharmacy / Clinic *</Label>
        <Select value={orgId} onValueChange={setOrgId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Choose an organization..." />
          </SelectTrigger>
          <SelectContent>
            {organizations.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.name} ({o.type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="w-full bg-teal-600 hover:bg-teal-700"
        disabled={!providerId || !orgId || loading}
        onClick={() => onLink({ provider_id: providerId, buyer_organization_id: orgId })}
      >
        <Link className="w-4 h-4 mr-2" />
        {loading ? 'Connecting...' : 'Connect Pharmacy to Supplier'}
      </Button>
    </div>
  );
}