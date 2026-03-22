import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstitutionManagement() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingInst, setEditingInst] = useState(null);
  const [formData, setFormData] = useState({
    institution_name: '',
    institution_type: 'hospital',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    credit_limit: '',
    credit_terms_days: '30',
    status: 'active',
    notes: ''
  });

  // Fetch institutions
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      try {
        return await base44.entities.Institution.filter(orgFilter, '-created_date');
      } catch {
        return [];
      }
    },
    enabled: !!selectedOrgId,
  });

  // Create/Update institution
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        organization_id: selectedOrgId,
        institution_name: formData.institution_name,
        institution_type: formData.institution_type,
        contact_person: formData.contact_person || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        address: formData.address || null,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        credit_terms_days: parseInt(formData.credit_terms_days) || 30,
        status: formData.status,
        notes: formData.notes || null
      };

      if (editingInst) {
        return base44.entities.Institution.update(editingInst.id, data);
      } else {
        return base44.entities.Institution.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      setShowDialog(false);
      setEditingInst(null);
      setFormData({
        institution_name: '',
        institution_type: 'hospital',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        address: '',
        credit_limit: '',
        credit_terms_days: '30',
        status: 'active',
        notes: ''
      });
      toast.success(editingInst ? 'Institution updated' : 'Institution added');
    },
    onError: () => {
      toast.error('Failed to save institution');
    }
  });

  // Delete institution
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Institution.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      toast.success('Institution deleted');
    },
    onError: () => {
      toast.error('Failed to delete institution');
    }
  });

  // Filter institutions
  const filteredInstitutions = institutions.filter(inst =>
    inst.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.contact_phone?.includes(searchQuery)
  );

  const openDialog = (inst = null) => {
    if (inst) {
      setEditingInst(inst);
      setFormData({
        institution_name: inst.institution_name,
        institution_type: inst.institution_type || 'hospital',
        contact_person: inst.contact_person || '',
        contact_phone: inst.contact_phone || '',
        contact_email: inst.contact_email || '',
        address: inst.address || '',
        credit_limit: inst.credit_limit?.toString() || '',
        credit_terms_days: inst.credit_terms_days?.toString() || '30',
        status: inst.status || 'active',
        notes: inst.notes || ''
      });
    } else {
      setEditingInst(null);
      setFormData({
        institution_name: '',
        institution_type: 'hospital',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        address: '',
        credit_limit: '',
        credit_terms_days: '30',
        status: 'active',
        notes: ''
      });
    }
    setShowDialog(true);
  };

  if (!selectedOrgId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Organization Selected</h2>
          <p className="text-slate-600">Please select an organization to continue.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              Institution Management
            </h1>
            <p className="text-slate-600 mt-1">Manage credit institutions for credit sales</p>
          </div>
          <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Institution
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, contact, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Institutions List */}
        {filteredInstitutions.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No institutions found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredInstitutions.map((inst) => (
              <Card key={inst.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900">{inst.institution_name}</h3>
                          <Badge className={inst.status === 'active' ? 'bg-green-600' : inst.status === 'inactive' ? 'bg-slate-600' : 'bg-red-600'}>
                            {inst.status}
                          </Badge>
                          <Badge variant="outline">{inst.institution_type}</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {inst.contact_person && (
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="font-medium">Contact:</span> {inst.contact_person}
                            </div>
                          )}
                          {inst.contact_phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <Phone className="w-4 h-4" /> {inst.contact_phone}
                            </div>
                          )}
                          {inst.contact_email && (
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <Mail className="w-4 h-4" /> {inst.contact_email}
                            </div>
                          )}
                          {inst.address && (
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <MapPin className="w-4 h-4" /> {inst.address}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 bg-slate-50 p-3 rounded">
                          {inst.credit_limit && (
                            <div>
                              <p className="text-xs text-slate-600">Credit Limit</p>
                              <p className="font-bold text-slate-900">Rs. {inst.credit_limit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-600">Payment Terms</p>
                            <p className="font-bold text-slate-900">{inst.credit_terms_days} days</p>
                          </div>
                        </div>

                        {inst.notes && (
                          <p className="text-xs text-slate-600 italic mt-3">📝 {inst.notes}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(inst)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (confirm(`Delete ${inst.institution_name}?`)) {
                              deleteMutation.mutate(inst.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInst ? 'Edit Institution' : 'Add New Institution'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Institution Name *</Label>
                <Input
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  placeholder="e.g. Green Memorial Hospital"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Institution Type</Label>
                <Select value={formData.institution_type} onValueChange={(v) => setFormData({ ...formData, institution_type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Contact Person</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Phone number"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="Email address"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Credit Limit (Optional)</Label>
                <Input
                  type="number"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-sm">Payment Terms (Days)</Label>
                <Input
                  type="number"
                  value={formData.credit_terms_days}
                  onChange={(e) => setFormData({ ...formData, credit_terms_days: e.target.value })}
                  placeholder="30"
                  className="mt-1"
                  min="1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!formData.institution_name || saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? 'Saving...' : editingInst ? 'Update' : 'Add'} Institution
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}