import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ROLE_TAGS = ['reception', 'nurse', 'doctor', 'billing', 'admin'];

export default function ExtensionForm({ initial = {}, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    extension_number: initial.extension_number || '',
    display_name: initial.display_name || '',
    email: initial.email || '',
    mobile: initial.mobile || '',
    pbx_extension_id: initial.pbx_extension_id || '',
    role_tag: initial.role_tag || '',
    is_active: initial.is_active !== false,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Extension Number *</Label>
          <Input placeholder="e.g. 101" value={form.extension_number} onChange={e => setForm(p => ({ ...p, extension_number: e.target.value }))} />
        </div>
        <div>
          <Label>Display Name *</Label>
          <Input placeholder="e.g. Reception Desk" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <Input type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div>
          <Label>Mobile</Label>
          <Input placeholder="+94 77 XXXXXXX" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Role Tag</Label>
          <Select value={form.role_tag} onValueChange={v => setForm(p => ({ ...p, role_tag: v }))}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {ROLE_TAGS.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>PBX Extension ID <span className="text-xs text-slate-400">(optional)</span></Label>
          <Input placeholder="ID from PBX system" value={form.pbx_extension_id} onChange={e => setForm(p => ({ ...p, pbx_extension_id: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isSaving || !form.extension_number || !form.display_name}>
          {isSaving ? 'Saving...' : 'Save Extension'}
        </Button>
      </div>
    </div>
  );
}