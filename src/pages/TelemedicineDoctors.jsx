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
import { Plus, UserCheck, Pencil, CheckCircle, Clock, XCircle } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  specialty: '',
  license_number: '',
  verification_status: 'VERIFIED',
  is_active: true,
};

const STATUS_COLORS = {
  VERIFIED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function TelemedicineDoctors() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['teleProviders'],
    queryFn: () => base44.entities.TeleProvider.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.TeleProvider.update(editing.id, data)
      : base44.entities.TeleProvider.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleProviders'] });
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditing(null);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.TeleProvider.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teleProviders'] }),
  });

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, specialty: p.specialty || '', license_number: p.license_number || '', verification_status: p.verification_status || 'VERIFIED', is_active: p.is_active !== false });
    setOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Virtual Doctors</h1>
          <p className="text-slate-500 text-sm">Add and manage doctors available for teleconsultations</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Doctor</Button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading...</p>}

      {!isLoading && providers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <UserCheck className="w-12 h-12 text-teal-200 mb-3" />
            <p className="text-slate-500 font-medium">No doctors yet.</p>
            <p className="text-slate-400 text-sm mb-4">Add your first doctor to enable patient bookings.</p>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Doctor</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map(p => (
          <Card key={p.id} className={`${p.is_active === false ? 'opacity-60' : ''}`}>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-500">{p.specialty || 'No specialty set'}</p>
                </div>
                <Badge className={`${STATUS_COLORS[p.verification_status] || ''} border-0 text-xs`}>
                  {p.verification_status || 'PENDING'}
                </Badge>
              </div>
              {p.license_number && (
                <p className="text-xs text-slate-400">License: {p.license_number}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={p.is_active !== false ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-teal-600 border-teal-200 hover:bg-teal-50'}
                  onClick={() => toggleActive.mutate({ id: p.id, is_active: p.is_active === false })}
                >
                  {p.is_active !== false ? <><XCircle className="w-3.5 h-3.5 mr-1" />Deactivate</> : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Activate</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input className="mt-1" placeholder="Dr. John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Specialty</Label>
              <Input className="mt-1" placeholder="e.g. General Practice, Cardiology" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
            </div>
            <div>
              <Label>License Number</Label>
              <Input className="mt-1" placeholder="e.g. SLMC-12345" value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
            </div>
            <div>
              <Label>Verification Status</Label>
              <Select value={form.verification_status} onValueChange={v => setForm(f => ({ ...f, verification_status: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!form.name || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}