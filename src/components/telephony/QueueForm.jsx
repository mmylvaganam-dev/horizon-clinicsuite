import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function QueueForm({ initial = {}, extensions = [], onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    pbx_queue_id: initial.pbx_queue_id || '',
    strategy: initial.strategy || 'ring_all',
    members: initial.members || [],
    is_active: initial.is_active !== false,
  });

  const toggleMember = (extId) => {
    setForm(p => ({
      ...p,
      members: p.members.includes(extId) ? p.members.filter(m => m !== extId) : [...p.members, extId]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Queue Name *</Label>
          <Input placeholder="e.g. Reception" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <Label>Ring Strategy</Label>
          <Select value={form.strategy} onValueChange={v => setForm(p => ({ ...p, strategy: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ring_all">Ring All</SelectItem>
              <SelectItem value="hunt">Hunt (Sequential)</SelectItem>
              <SelectItem value="round_robin">Round Robin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>PBX Queue ID <span className="text-xs text-slate-400">(optional)</span></Label>
        <Input placeholder="ID from PBX system" value={form.pbx_queue_id} onChange={e => setForm(p => ({ ...p, pbx_queue_id: e.target.value }))} />
      </div>

      <div>
        <Label className="mb-2 block">Queue Members</Label>
        {extensions.length === 0 && <p className="text-sm text-slate-400">No extensions available. Add extensions first.</p>}
        <div className="flex flex-wrap gap-2">
          {extensions.map(ext => {
            const selected = form.members.includes(ext.id);
            return (
              <button
                key={ext.id}
                type="button"
                onClick={() => toggleMember(ext.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selected
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-violet-400'
                }`}
              >
                {ext.extension_number} · {ext.display_name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isSaving || !form.name}>
          {isSaving ? 'Saving...' : 'Save Queue'}
        </Button>
      </div>
    </div>
  );
}