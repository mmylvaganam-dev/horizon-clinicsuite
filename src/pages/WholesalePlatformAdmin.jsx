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
import { Building2, Plus, Users, CheckCircle, XCircle, Lock, Package, Link } from 'lucide-react';
import toast from 'react-hot-toast';

const PLATFORM_OWNERS = [
  'mmylvaganam@premierhealthcanada.ca',
  'mylvaganam@premierhealthcanada.ca',
];

export default function WholesalePlatformAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: '', company_code: '', description: '', email: '', phone: '', address: '', admin_emails: '' });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  if (user && !PLATFORM_OWNERS.includes(user?.email)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-900">Platform Owner Only</h2>
        <p className="text-slate-500">Only platform owners can manage wholesale providers.</p>
      </div>
    );
  }

  const { data: providers = [] } = useQuery({
    queryKey: ['wholesaleProviders'],
    queryFn: () => base44.entities.WholesaleProvider.list(),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['wholesaleConnections'],
    queryFn: () => base44.entities.WholesaleConnection.list(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const createProviderMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.WholesaleProvider.create({
        ...form,
        admin_emails: form.admin_emails.split(',').map(e => e.trim()).filter(Boolean),
        status: 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wholesaleProviders']);
      toast.success('Wholesale provider created!');
      setOpen(false);
      setForm({ company_name: '', company_code: '', description: '', email: '', phone: '', address: '', admin_emails: '' });
    },
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, status, approved_by }) => {
      return await base44.entities.WholesaleConnection.update(id, { status, approved_by, approved_date: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wholesaleConnections']);
      toast.success('Connection updated!');
    },
  });

  const linkConnectionMutation = useMutation({
    mutationFn: async ({ provider_id, buyer_organization_id }) => {
      const provider = providers.find(p => p.id === provider_id);
      const org = organizations.find(o => o.id === buyer_organization_id);
      const existing = connections.find(c => c.provider_id === provider_id && c.buyer_organization_id === buyer_organization_id);
      if (existing) { throw new Error('Connection already exists'); }
      return await base44.entities.WholesaleConnection.create({
        provider_id,
        provider_name: provider?.company_name || '',
        buyer_organization_id,
        buyer_company_id: org?.company_id || '',
        buyer_name: org?.name || '',
        status: 'active',
        initiated_by: 'platform_admin',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
        credit_limit: 0,
        current_balance: 0,
        payment_terms_days: provider?.payment_terms_days || 30,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wholesaleConnections']);
      toast.success('Buyer linked to provider!');
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingConnections = connections.filter(c => c.status === 'pending');
  const activeConnections = connections.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-black">Wholesale Platform Admin</h1>
              <p className="text-slate-400 text-sm">Manage all wholesale providers and buyer connections</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" /> New Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Wholesale Provider</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
                  <div><Label>Code *</Label><Input placeholder="e.g. MEDX" value={form.company_code} onChange={e => setForm(f => ({ ...f, company_code: e.target.value.toUpperCase() }))} /></div>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div>
                  <Label>Admin Emails (comma-separated)</Label>
                  <Input placeholder="admin1@example.com, admin2@example.com" value={form.admin_emails} onChange={e => setForm(f => ({ ...f, admin_emails: e.target.value }))} />
                  <p className="text-xs text-slate-500 mt-1">These users will be able to manage this provider's admin portal</p>
                </div>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => createProviderMutation.mutate()} disabled={!form.company_name || !form.company_code || createProviderMutation.isPending}>
                  {createProviderMutation.isPending ? 'Creating...' : 'Create Provider'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers" className="flex items-center gap-2"><Package className="w-4 h-4" /> Providers ({providers.length})</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Pending Connections
            {pendingConnections.length > 0 && <Badge className="bg-yellow-500 text-white ml-1">{pendingConnections.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2"><Link className="w-4 h-4" /> Link Buyer</TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Active ({activeConnections.length})</TabsTrigger>
        </TabsList>

        {/* All Providers */}
        <TabsContent value="providers" className="space-y-4 mt-4">
          {providers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No wholesale providers yet. Create one above.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {providers.map(p => {
                const connCount = connections.filter(c => c.provider_id === p.id && c.status === 'active').length;
                return (
                  <Card key={p.id} className="border-2 hover:border-indigo-300 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 text-lg">{p.company_name}</h3>
                            <Badge className="bg-indigo-100 text-indigo-700 text-xs">{p.company_code}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">{p.description}</p>
                          <p className="text-xs text-slate-400 mt-1">{p.email} · {p.phone}</p>
                          <p className="text-xs text-indigo-600 mt-2 font-medium">👥 {connCount} active buyer{connCount !== 1 ? 's' : ''}</p>
                        </div>
                        <Badge className={p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {p.status}
                        </Badge>
                      </div>
                      {p.admin_emails?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-1">Admins:</p>
                          <div className="flex flex-wrap gap-1">
                            {p.admin_emails.map(e => (
                              <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Pending Connection Approvals */}
        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingConnections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No pending connection requests</div>
          ) : pendingConnections.map(c => (
            <Card key={c.id} className="border-2 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{c.buyer_name} → {c.provider_name}</p>
                    <p className="text-xs text-slate-500 mt-1">Initiated by: {c.initiated_by} · Requested connection</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateConnectionMutation.mutate({ id: c.id, status: 'active', approved_by: user?.email })}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateConnectionMutation.mutate({ id: c.id, status: 'rejected', approved_by: user?.email })}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Manually Link Buyer to Provider */}
        <TabsContent value="link" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Link a Retail Pharmacy to a Wholesale Provider</CardTitle></CardHeader>
            <CardContent>
              <ManualLinkForm providers={providers} organizations={organizations} onLink={(data) => linkConnectionMutation.mutate(data)} loading={linkConnectionMutation.isPending} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Connections */}
        <TabsContent value="active" className="space-y-3 mt-4">
          {activeConnections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No active connections yet</div>
          ) : activeConnections.map(c => (
            <Card key={c.id} className="border border-slate-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{c.buyer_name}</p>
                  <p className="text-sm text-slate-500">→ {c.provider_name}</p>
                  <p className="text-xs text-slate-400 mt-1">Initiated by: {c.initiated_by}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                  {c.credit_limit > 0 && <p className="text-xs text-slate-500 mt-1">Credit: LKR {c.credit_limit?.toLocaleString()}</p>}
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
    <div className="space-y-4 max-w-md">
      <div>
        <Label>Select Wholesale Provider</Label>
        <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={providerId} onChange={e => setProviderId(e.target.value)}>
          <option value="">-- Choose Provider --</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.company_name} ({p.company_code})</option>)}
        </select>
      </div>
      <div>
        <Label>Select Retail Pharmacy / Organization</Label>
        <select className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-sm" value={orgId} onChange={e => setOrgId(e.target.value)}>
          <option value="">-- Choose Organization --</option>
          {organizations.map(o => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
        </select>
      </div>
      <Button
        className="bg-indigo-600 hover:bg-indigo-700"
        disabled={!providerId || !orgId || loading}
        onClick={() => onLink({ provider_id: providerId, buyer_organization_id: orgId })}
      >
        {loading ? 'Linking...' : '🔗 Link Now (Active Immediately)'}
      </Button>
    </div>
  );
}