import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MapPin, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLocations() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [formData, setFormData] = useState({
    organization_id: '', name: '', code: '', type: 'branch',
    address: '', city: '', state: '', postal_code: '',
    country_code: '', phone: '', email: '', status: 'active'
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('-created_date'),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Location.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setFormOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Location.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });

  const resetForm = () => {
    setFormData({
      organization_id: '', name: '', code: '', type: 'branch',
      address: '', city: '', state: '', postal_code: '',
      country_code: '', phone: '', email: '', status: 'active'
    });
    setEditingLoc(null);
  };

  const handleEdit = (loc) => {
    setEditingLoc(loc);
    setFormData(loc);
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingLoc) {
      updateMutation.mutate({ id: editingLoc.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : orgId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Admin')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Locations</h1>
            <p className="text-slate-500 mt-1">{locations.length} locations</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <Card key={loc.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <Badge variant="outline">{loc.status}</Badge>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{loc.name}</h3>
              <p className="text-sm text-slate-500 mb-1">{loc.code} • {loc.type}</p>
              <p className="text-xs text-slate-400 mb-3">{getOrgName(loc.organization_id)}</p>
              {loc.city && <p className="text-sm text-slate-500 mb-3">{loc.city}, {loc.country_code}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(loc)} className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(loc.id)} className="text-rose-600 hover:text-rose-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLoc ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization *</Label>
              <Select value={formData.organization_id} onValueChange={(v) => setFormData({...formData, organization_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="satellite">Satellite</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>State/Province</Label>
                <Input value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Country Code</Label>
                <Input value={formData.country_code} onChange={(e) => setFormData({...formData, country_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {editingLoc ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}