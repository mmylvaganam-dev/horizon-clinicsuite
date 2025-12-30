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
import { Building2, Plus, Edit, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    vendor_type: 'other',
    status: 'active',
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.VendorProfile.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        organization_id: user.organization_id || '',
        ...data
      };

      let result;
      if (editing) {
        result = await base44.entities.VendorProfile.update(editing.id, payload);
      } else {
        result = await base44.entities.VendorProfile.create(payload);
      }

      // Sync to PayeeDirectory
      const payeeData = {
        organization_id: user.organization_id || '',
        payee_type: 'VENDOR',
        source_ref_id: result.id,
        display_name: result.vendor_name,
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
        action: editing ? 'update_vendor' : 'create_vendor',
        record_type: 'VendorProfile',
        record_id: result.id,
        metadata: { vendor_name: result.vendor_name }
      });

      return result;
    },
    onSuccess: () => {
      toast.success(editing ? 'Vendor updated' : 'Vendor added');
      queryClient.invalidateQueries(['vendors']);
      setDialogOpen(false);
      setEditing(null);
      setFormData({
        vendor_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        vendor_type: 'other',
        status: 'active',
        notes: ''
      });
    },
  });

  const handleEdit = (vendor) => {
    setEditing(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      vendor_type: vendor.vendor_type,
      status: vendor.status,
      notes: vendor.notes || ''
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vendor Management</h1>
          <p className="text-slate-500 mt-1">Manage suppliers and service providers</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((vendor) => (
          <Card key={vendor.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{vendor.vendor_name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs capitalize">
                      {vendor.vendor_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(vendor)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vendor.contact_person && (
                <p className="text-sm text-slate-600 mb-1">Contact: {vendor.contact_person}</p>
              )}
              {vendor.phone && (
                <p className="text-sm text-slate-600 mb-1">Phone: {vendor.phone}</p>
              )}
              {vendor.email && (
                <p className="text-sm text-slate-600 mb-1">Email: {vendor.email}</p>
              )}
              <Badge className={vendor.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                {vendor.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Vendor Name *</label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="ABC Supplies Ltd"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Vendor Type *</label>
                <Select value={formData.vendor_type} onValueChange={(v) => setFormData({ ...formData, vendor_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pharmacy_supplier">Pharmacy Supplier</SelectItem>
                    <SelectItem value="lab_supplier">Lab Supplier</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="IT">IT Services</SelectItem>
                    <SelectItem value="rent">Rent/Landlord</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
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

            <div>
              <label className="text-sm font-medium">Contact Person</label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="John Smith"
              />
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
                  placeholder="contact@vendor.com"
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
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.vendor_name || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Vendor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}