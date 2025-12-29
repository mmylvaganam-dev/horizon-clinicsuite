import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

export default function AdminServiceCatalog() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({
    organization_id: '',
    code: '',
    name: '',
    category: 'consultation',
    default_price: 0,
    taxable: false,
    is_active: true,
    description: ''
  });

  const { data: services = [] } = useQuery({
    queryKey: ['serviceCatalog'],
    queryFn: () => base44.entities.ServiceCatalog.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const service = await base44.entities.ServiceCatalog.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'create_service',
        record_type: 'ServiceCatalog',
        record_id: service.id,
        metadata: { code: data.code, name: data.name }
      });
      return service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCatalog'] });
      resetForm();
      toast.success('Service created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const service = await base44.entities.ServiceCatalog.update(id, data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'update_service',
        record_type: 'ServiceCatalog',
        record_id: id,
        metadata: { code: data.code, name: data.name }
      });
      return service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCatalog'] });
      resetForm();
      toast.success('Service updated!');
    }
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingService(null);
    setForm({
      organization_id: '',
      code: '',
      name: '',
      category: 'consultation',
      default_price: 0,
      taxable: false,
      is_active: true,
      description: ''
    });
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setForm({ ...service });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.name) {
      toast.error('Code and name are required');
      return;
    }

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const categoryColors = {
    consultation: 'bg-blue-100 text-blue-700',
    lab: 'bg-purple-100 text-purple-700',
    cardiology: 'bg-red-100 text-red-700',
    pft: 'bg-green-100 text-green-700',
    radiology: 'bg-yellow-100 text-yellow-700',
    pharmacy: 'bg-teal-100 text-teal-700',
    other: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Service Catalog</h1>
          <p className="text-slate-500 mt-1">Manage services and pricing</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">{service.code}</Badge>
                  <Badge variant="outline" className={categoryColors[service.category]}>
                    {service.category}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-900">{service.name}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Price:</span>
                <span className="font-semibold">${service.default_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable:</span>
                {service.taxable ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <X className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <Badge variant={service.is_active ? 'default' : 'outline'}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="pft">PFT</SelectItem>
                    <SelectItem value="radiology">Radiology</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Default Price *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.default_price}
                onChange={(e) => setForm({ ...form, default_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Taxable</Label>
              <Switch
                checked={form.taxable}
                onCheckedChange={(val) => setForm({ ...form, taxable: val })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(val) => setForm({ ...form, is_active: val })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingService ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}