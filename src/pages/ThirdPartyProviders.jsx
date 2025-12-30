import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Plus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ThirdPartyProviders() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    provider_name: '',
    provider_type: 'other',
    phone: '',
    email: '',
    address: '',
    contract_notes: '',
    status: 'active'
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['thirdPartyProviders'],
    queryFn: () => base44.entities.ThirdPartyProviderProfile.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        organization_id: user.organization_id || '',
        ...data
      };

      let result;
      if (editing) {
        result = await base44.entities.ThirdPartyProviderProfile.update(editing.id, payload);
      } else {
        result = await base44.entities.ThirdPartyProviderProfile.create(payload);
      }

      // Sync to PayeeDirectory
      const payeeData = {
        organization_id: user.organization_id || '',
        payee_type: 'THIRDPARTY',
        source_ref_id: result.id,
        display_name: result.provider_name,
        status: result.status
      };

      const existingPayee = await base44.entities.PayeeDirectory.filter({ source_ref_id: result.id });
      if (existingPayee.length > 0) {
        await base44.entities.PayeeDirectory.update(existingPayee[0].id, payeeData);
      } else {
        await base44.entities.PayeeDirectory.create(payeeData);
      }

      // Audit log
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'OPERATIONS',
        action: editing ? 'update_third_party_provider' : 'create_third_party_provider',
        record_type: 'ThirdPartyProviderProfile',
        record_id: result.id,
        metadata: { provider_name: result.provider_name }
      });

      return result;
    },
    onSuccess: () => {
      toast.success(editing ? 'Provider updated' : 'Provider added');
      queryClient.invalidateQueries(['thirdPartyProviders']);
      setDialogOpen(false);
      setEditing(null);
      setFormData({
        provider_name: '',
        provider_type: 'other',
        phone: '',
        email: '',
        address: '',
        contract_notes: '',
        status: 'active'
      });
    },
  });

  const handleEdit = (provider) => {
    setEditing(provider);
    setFormData({
      provider_name: provider.provider_name,
      provider_type: provider.provider_type,
      phone: provider.phone || '',
      email: provider.email || '',
      address: provider.address || '',
      contract_notes: provider.contract_notes || '',
      status: provider.status
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Third-Party Providers</h1>
          <p className="text-slate-500 mt-1">Manage consultants, contractors, and external providers</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{provider.provider_name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs capitalize">
                      {provider.provider_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(provider)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {provider.phone && (
                <p className="text-sm text-slate-600 mb-1">Phone: {provider.phone}</p>
              )}
              {provider.email && (
                <p className="text-sm text-slate-600 mb-1">Email: {provider.email}</p>
              )}
              {provider.contract_notes && (
                <p className="text-sm text-slate-600 mb-2 italic">{provider.contract_notes}</p>
              )}
              <Badge className={provider.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                {provider.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Provider Name *</label>
              <Input
                value={formData.provider_name}
                onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                placeholder="Dr. John Smith / ABC Consulting"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Provider Type *</label>
                <Select value={formData.provider_type} onValueChange={(v) => setFormData({ ...formData, provider_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consult_specialist">Consultant Specialist</SelectItem>
                    <SelectItem value="radiologist">Radiologist</SelectItem>
                    <SelectItem value="sonographer">Sonographer</SelectItem>
                    <SelectItem value="lab_reference">Reference Lab</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Status *</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="provider@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Address</label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, Country"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Contract Notes</label>
              <Textarea
                value={formData.contract_notes}
                onChange={(e) => setFormData({ ...formData, contract_notes: e.target.value })}
                placeholder="Contract terms, rates, engagement details..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.provider_name || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Provider'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}