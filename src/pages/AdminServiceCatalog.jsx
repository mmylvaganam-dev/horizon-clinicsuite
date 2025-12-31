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
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [bulkData, setBulkData] = useState('');
  const [form, setForm] = useState({
    organization_id: '',
    service_code: '',
    service_name: '',
    category: 'TEST',
    default_price: 0,
    currency: 'LKR',
    active: true
  });

  const { data: services = [] } = useQuery({
    queryKey: ['serviceCatalog'],
    queryFn: () => base44.entities.ServiceCatalog.list('-created_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const serviceData = {
        ...data,
        organization_id: user?.organization_id || ''
      };
      const service = await base44.entities.ServiceCatalog.create(serviceData);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user?.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'create_service',
        record_type: 'ServiceCatalog',
        record_id: service.id,
        metadata: { code: data.service_code, name: data.service_name }
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
      const updateData = {
        ...data,
        organization_id: user?.organization_id || data.organization_id
      };
      const service = await base44.entities.ServiceCatalog.update(id, updateData);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user?.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'update_service',
        record_type: 'ServiceCatalog',
        record_id: id,
        metadata: { code: data.service_code, name: data.service_name }
      });
      return service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCatalog'] });
      resetForm();
      toast.success('Service updated!');
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        await base44.entities.ServiceCatalog.create({
          organization_id: user?.organization_id || '',
          service_code: item.code,
          service_name: item.name,
          category: 'TEST',
          default_price: item.price,
          currency: 'LKR',
          active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCatalog'] });
      setShowBulkImport(false);
      setBulkData('');
      toast.success('Services imported successfully!');
    }
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingService(null);
    setForm({
      organization_id: '',
      service_code: '',
      service_name: '',
      category: 'TEST',
      default_price: 0,
      currency: 'LKR',
      active: true
    });
  };

  const handleBulkImport = () => {
    const lines = bulkData.split('\n').filter(l => l.trim());
    const items = lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const priceStr = parts[1].replace(/Rs\.|,/g, '').trim();
        const price = parseFloat(priceStr) || 0;
        const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20);
        return { name, price, code };
      }
      return null;
    }).filter(Boolean);

    if (items.length === 0) {
      toast.error('No valid items found');
      return;
    }

    bulkImportMutation.mutate(items);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setForm({ ...service });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.service_code || !form.service_name) {
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">{service.service_code}</Badge>
                <Badge variant="outline" className={categoryColors[service.category] || 'bg-slate-100 text-slate-700'}>
                  {service.category}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-900">{service.service_name}</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
              <Edit className="w-4 h-4" />
            </Button>
            </div>
            <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Price:</span>
              <span className="font-semibold">Rs. {service.default_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <Badge variant={service.active ? 'default' : 'outline'}>
                {service.active ? 'Active' : 'Inactive'}
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
                  value={form.service_code}
                  onChange={(e) => setForm({ ...form, service_code: e.target.value })}
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULT_GP">Consult GP</SelectItem>
                    <SelectItem value="CONSULT_SPECIALIST">Consult Specialist</SelectItem>
                    <SelectItem value="TEST">Test</SelectItem>
                    <SelectItem value="IMAGING">Imaging</SelectItem>
                    <SelectItem value="LAB_COLLECTION">Lab Collection</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Default Price (Rs.) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.default_price}
                onChange={(e) => setForm({ ...form, default_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(val) => setForm({ ...form, active: val })}
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

      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Services</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Paste tab-separated data: Test Name [TAB] Rs. Price
            </p>
            <Textarea
              placeholder="Fasting Blood Sugar&#9;Rs. 530.00&#10;Lipid Profile&#9;Rs. 2,100.00&#10;Full Blood Count&#9;Rs. 400.00"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBulkImport(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkImport} disabled={bulkImportMutation.isPending || !bulkData.trim()}>
                {bulkImportMutation.isPending ? 'Importing...' : 'Import Services'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}