import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Package, Phone, Mail, Building2, MessageSquare, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSDirectRequest({ orgId, user, connections }) {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState({
    medicine_name: '',
    quantity: '',
    unit: 'boxes',
    notes: '',
    contact_phone: '',
  });

  const { data: allProviders = [] } = useQuery({
    queryKey: ['wholesaleProviders'],
    queryFn: () => base44.entities.WholesaleProvider.filter({ status: 'active' }),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const activeConnectionProviderIds = (connections || []).filter(c => c.status === 'active').map(c => c.provider_id);
  const pendingProviderIds = (connections || []).filter(c => c.status === 'pending').map(c => c.provider_id);

  const requestConnectionMutation = useMutation({
    mutationFn: async (providerId) => {
      const provider = allProviders.find(p => p.id === providerId);
      const org = organizations.find(o => o.id === orgId);
      return await base44.entities.WholesaleConnection.create({
        provider_id: providerId,
        provider_name: provider?.company_name || '',
        buyer_organization_id: orgId,
        buyer_company_id: org?.company_id || '',
        buyer_name: org?.name || '',
        status: 'pending',
        initiated_by: 'buyer',
        credit_limit: 0,
        current_balance: 0,
        payment_terms_days: provider?.payment_terms_days || 30,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsMyConnections', orgId]);
      toast.success('Connection request sent! Awaiting supplier approval.');
    },
    onError: () => toast.error('Failed to send request'),
  });

  const sendStockRequestMutation = useMutation({
    mutationFn: async () => {
      const org = organizations.find(o => o.id === orgId);
      const orderNum = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;

      // Create a WholesaleOrder marked as a "request" (pending status, zero total until priced)
      const order = await base44.entities.WholesaleOrder.create({
        provider_id: selectedProvider.id,
        provider_name: selectedProvider.company_name,
        order_number: orderNum,
        company_id: org?.company_id || '',
        company_name: org?.name || '',
        organization_id: orgId,
        status: 'pending',
        subtotal: 0,
        discount_amount: 0,
        total: 0,
        payment_status: 'unpaid',
        notes: `📋 STOCK REQUEST\n\nMedicine/Item: ${form.medicine_name}\nQuantity: ${form.quantity} ${form.unit}\nContact Phone: ${form.contact_phone || 'N/A'}\n\nAdditional Notes: ${form.notes || 'None'}`,
        ordered_by: user?.email,
        order_type: 'request',
      });

      // Create a single order item for the requested product
      await base44.entities.WholesaleOrderItem.create({
        order_id: order.id,
        provider_id: selectedProvider.id,
        product_id: '',
        product_name: form.medicine_name,
        sku: '',
        category: 'medicine',
        qty: parseFloat(form.quantity) || 1,
        unit: form.unit,
        unit_price: 0,
        discount_pct: 0,
        line_total: 0,
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wsMyOrders', orgId]);
      setRequestOpen(false);
      setForm({ medicine_name: '', quantity: '', unit: 'boxes', notes: '', contact_phone: '' });
      toast.success('Stock request sent to supplier! They will contact you shortly.');
    },
    onError: () => toast.error('Failed to send stock request'),
  });

  const openRequest = (provider) => {
    setSelectedProvider(provider);
    setRequestOpen(true);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800">📋 Direct Stock Requests</p>
        <p className="text-xs text-blue-600 mt-1">
          Send a stock request directly to any wholesale supplier — even without a formal account connection. 
          The supplier will review your request and contact you with availability and pricing.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allProviders.map(provider => {
          const isConnected = activeConnectionProviderIds.includes(provider.id);
          const isPending = pendingProviderIds.includes(provider.id);
          return (
            <Card key={provider.id} className="border-2 hover:border-indigo-300 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{provider.company_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{provider.description}</p>
                  </div>
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-700 shrink-0">Connected</Badge>
                  ) : isPending ? (
                    <Badge className="bg-yellow-100 text-yellow-700 shrink-0">Pending</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 shrink-0">Not connected</Badge>
                  )}
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  {provider.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      <span>{provider.phone}</span>
                    </div>
                  )}
                  {provider.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      <span>{provider.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" />
                    <span>Code: {provider.company_code} · {provider.payment_terms_days || 30} day terms</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => openRequest(provider)}
                  >
                    <MessageSquare className="w-3 h-3 mr-1.5" />
                    Send Stock Request
                  </Button>
                  {!isConnected && !isPending && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => requestConnectionMutation.mutate(provider.id)}
                      disabled={requestConnectionMutation.isPending}
                    >
                      <Send className="w-3 h-3 mr-1.5" />
                      Request Account Connection
                    </Button>
                  )}
                  {isConnected && (
                    <p className="text-xs text-center text-green-600 font-medium">
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                      You can browse & order from the Browse tab
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {allProviders.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No wholesale suppliers available yet</p>
          </div>
        )}
      </div>

      {/* Stock Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Stock Request — {selectedProvider?.company_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-700">
              Your request will be sent directly to <strong>{selectedProvider?.company_name}</strong>. 
              They will contact you with availability and pricing.
            </div>

            <div>
              <Label>Medicine / Product Name <span className="text-red-500">*</span></Label>
              <Input
                className="mt-1"
                placeholder="e.g. Paracetamol 500mg, Insulin Pen Needles..."
                value={form.medicine_name}
                onChange={e => setForm(f => ({ ...f, medicine_name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity <span className="text-red-500">*</span></Label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="e.g. 10"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <select
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                >
                  <option value="boxes">Boxes</option>
                  <option value="strips">Strips</option>
                  <option value="units">Units</option>
                  <option value="bottles">Bottles</option>
                  <option value="vials">Vials</option>
                  <option value="packs">Packs</option>
                  <option value="pieces">Pieces</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Your Contact Phone (Optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. 077 123 4567"
                value={form.contact_phone}
                onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
              />
            </div>

            <div>
              <Label>Additional Notes (Optional)</Label>
              <textarea
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="e.g. Brand preference, urgency, delivery instructions..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => sendStockRequestMutation.mutate()}
                disabled={!form.medicine_name || !form.quantity || sendStockRequestMutation.isPending}
              >
                {sendStockRequestMutation.isPending ? 'Sending...' : (
                  <><Send className="w-4 h-4 mr-2" /> Send Request</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}