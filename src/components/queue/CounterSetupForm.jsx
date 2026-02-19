import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function CounterSetupForm({ open, onOpenChange, counter, organizationId, onSaved }) {
  const [form, setForm] = useState(counter ? { ...counter } : {
    name: '',
    code: '',
    counter_type: 'opd',
    prefix: '',
    status: 'active',
    display_message: '',
    sms_enabled: false,
    sms_notify_ahead: 3,
    location_id: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', organizationId],
    queryFn: () => base44.entities.Location.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
  });

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, organization_id: organizationId };
    if (counter) {
      await base44.entities.QueueCounter.update(counter.id, data);
    } else {
      await base44.entities.QueueCounter.create(data);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{counter ? 'Edit Counter' : 'Add New Counter'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Counter Name *</Label>
            <Input placeholder="e.g., OPD Counter 1, Lab Counter, Pharmacy" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Code *</Label>
              <Input placeholder="OPD1" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1" />
            </div>
            <div>
              <Label>Token Prefix *</Label>
              <Input placeholder="A, OPD, LAB" value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value.toUpperCase() })} className="mt-1" />
              <p className="text-xs text-slate-400 mt-1">
                Tokens: <strong>{form.prefix || 'A'}001</strong>, {form.prefix || 'A'}002...
              </p>
            </div>
          </div>

          <div>
            <Label>Counter Type</Label>
            <Select value={form.counter_type} onValueChange={v => setForm({ ...form, counter_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="opd">🏥 OPD</SelectItem>
                <SelectItem value="lab">🧪 Laboratory</SelectItem>
                <SelectItem value="pharmacy">💊 Pharmacy</SelectItem>
                <SelectItem value="doctor">👨‍⚕️ Doctor Consultation</SelectItem>
                <SelectItem value="consultation">🩺 Consultation</SelectItem>
                <SelectItem value="registration">📋 Registration</SelectItem>
                <SelectItem value="radiology">📷 Radiology</SelectItem>
                <SelectItem value="other">🏢 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {locations.length > 0 && (
            <div>
              <Label>Location</Label>
              <Select value={form.location_id || ''} onValueChange={v => setForm({ ...form, location_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All locations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All locations</SelectItem>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Display Board Message (optional)</Label>
            <Input placeholder="Custom message shown on TV display" value={form.display_message || ''} onChange={e => setForm({ ...form, display_message: e.target.value })} className="mt-1" />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium">SMS Notifications</p>
              <p className="text-xs text-slate-500">Alert patients when their turn is near via Dialog eSMS</p>
            </div>
            <Switch checked={form.sms_enabled || false} onCheckedChange={v => setForm({ ...form, sms_enabled: v })} />
          </div>

          {form.sms_enabled && (
            <div>
              <Label>Notify when X tokens ahead</Label>
              <Input type="number" min="1" max="10" value={form.sms_notify_ahead || 3} onChange={e => setForm({ ...form, sms_notify_ahead: parseInt(e.target.value) })} className="mt-1 w-24" />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name || !form.code || !form.prefix}>
              {saving ? 'Saving...' : counter ? 'Update Counter' : 'Create Counter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}