import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Pencil, CheckCircle, XCircle, Clock, Star } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VERIFICATION_BADGE = {
  VERIFIED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const EMPTY_FORM = {
  name: '',
  specialty: '',
  qualifications: '',
  license_number: '',
  languages: '',
  bio: '',
  years_experience: '',
  consultation_fee_usd: 50,
  available_from: '09:00',
  available_to: '17:00',
  available_days: [1, 2, 3, 4, 5],
  verification_status: 'PENDING',
  is_active: true,
};

export default function TelemedicineDoctors() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const qc = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['teleProviders'],
    queryFn: () => base44.entities.TeleProvider.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.TeleProvider.update(editing.id, data)
      : base44.entities.TeleProvider.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleProviders'] });
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.TeleProvider.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teleProviders'] }),
  });

  const setVerification = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TeleProvider.update(id, { verification_status: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teleProviders'] }),
  });

  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...EMPTY_FORM, ...p });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      available_days: f.available_days?.includes(day)
        ? f.available_days.filter(d => d !== day)
        : [...(f.available_days || []), day],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      years_experience: form.years_experience ? Number(form.years_experience) : undefined,
      consultation_fee_usd: Number(form.consultation_fee_usd),
    });
  };

  const verified = providers.filter(p => p.verification_status === 'VERIFIED' && p.is_active !== false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Telemedicine Doctors</h1>
          <p className="text-slate-500 text-sm">{verified.length} verified & active · {providers.length} total registered</p>
        </div>
        <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" /> Add Doctor
        </Button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading...</p>}

      {!isLoading && providers.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No doctors registered yet.</p>
          <p className="text-sm mt-1">Add a doctor to allow patients to book consultations.</p>
          <Button onClick={openNew} className="mt-4 bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> Add First Doctor
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map(p => (
          <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-sm text-teal-600">{p.specialty || 'General Practice'}</p>
                  {p.qualifications && <p className="text-xs text-slate-500">{p.qualifications}</p>}
                </div>
                {p.photo_url && (
                  <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={VERIFICATION_BADGE[p.verification_status] || 'bg-slate-100 text-slate-600'}>
                  {p.verification_status}
                </Badge>
                <Badge className={p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {p.consultation_fee_usd > 0 && (
                  <Badge className="bg-blue-100 text-blue-700">${p.consultation_fee_usd}/consult</Badge>
                )}
              </div>

              {p.languages && (
                <p className="text-xs text-slate-500">🌐 {p.languages}</p>
              )}

              {p.available_days?.length > 0 && (
                <div className="flex gap-1">
                  {DAYS.map((d, i) => (
                    <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${p.available_days.includes(i) ? 'bg-teal-100 text-teal-700 font-medium' : 'bg-slate-100 text-slate-400'}`}>
                      {d}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="flex-1">
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                {p.verification_status !== 'VERIFIED' ? (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1"
                    onClick={() => setVerification.mutate({ id: p.id, status: 'VERIFIED' })}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Verify
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="border-slate-300 flex-1"
                    onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}>
                    {p.is_active ? <><XCircle className="w-3 h-3 mr-1" /> Deactivate</> : <><CheckCircle className="w-3 h-3 mr-1" /> Activate</>}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <Label>Specialty</Label>
                <Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g. General Practice" />
              </div>
              <div>
                <Label>Qualifications</Label>
                <Input value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} placeholder="e.g. MBBS, MD" />
              </div>
              <div>
                <Label>License Number</Label>
                <Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
              </div>
              <div>
                <Label>Years Experience</Label>
                <Input type="number" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))} />
              </div>
              <div>
                <Label>Languages</Label>
                <Input value={form.languages} onChange={e => setForm(f => ({ ...f, languages: e.target.value }))} placeholder="e.g. English, Tamil" />
              </div>
              <div>
                <Label>Consultation Fee (USD)</Label>
                <Input type="number" value={form.consultation_fee_usd} onChange={e => setForm(f => ({ ...f, consultation_fee_usd: e.target.value }))} />
              </div>
              <div>
                <Label>Available From</Label>
                <Input type="time" value={form.available_from} onChange={e => setForm(f => ({ ...f, available_from: e.target.value }))} />
              </div>
              <div>
                <Label>Available To</Label>
                <Input type="time" value={form.available_to} onChange={e => setForm(f => ({ ...f, available_to: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Available Days</Label>
                <div className="flex gap-2 mt-1">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${form.available_days?.includes(i) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Verification Status</Label>
                <Select value={form.verification_status} onValueChange={v => setForm(f => ({ ...f, verification_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Bio (visible to patients)</Label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Short biography..."
                />
              </div>
              <div className="col-span-2">
                <Label>Photo URL</Label>
                <Input value={form.photo_url || ''} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Add Doctor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}