import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus } from 'lucide-react';

const DIGITS = ['0','1','2','3','4','5','6','7','8','9','*','#'];

export default function IVRForm({ initial = {}, queues = [], extensions = [], onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    pbx_ivr_id: initial.pbx_ivr_id || '',
    greeting_file_pointer: initial.greeting_file_pointer || '',
    menu_json: initial.menu_json || {},
    is_active: initial.is_active !== false,
  });

  const [newDigit, setNewDigit] = useState('1');
  const [newDestType, setNewDestType] = useState('queue');
  const [newDestId, setNewDestId] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const addMenuItem = () => {
    if (!newDigit || !newDestType) return;
    setForm(p => ({
      ...p,
      menu_json: {
        ...p.menu_json,
        [newDigit]: { type: newDestType, id: newDestId, label: newLabel }
      }
    }));
    setNewLabel('');
    setNewDestId('');
  };

  const removeMenuItem = (digit) => {
    const updated = { ...form.menu_json };
    delete updated[digit];
    setForm(p => ({ ...p, menu_json: updated }));
  };

  const destOptions = newDestType === 'queue' ? queues : newDestType === 'extension' ? extensions : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>IVR Menu Name *</Label>
          <Input placeholder="e.g. Main Menu" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <Label>PBX IVR ID <span className="text-xs text-slate-400">(optional)</span></Label>
          <Input placeholder="ID from PBX system" value={form.pbx_ivr_id} onChange={e => setForm(p => ({ ...p, pbx_ivr_id: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Greeting Audio URL <span className="text-xs text-slate-400">(optional)</span></Label>
        <Input placeholder="https://... or file reference" value={form.greeting_file_pointer} onChange={e => setForm(p => ({ ...p, greeting_file_pointer: e.target.value }))} />
      </div>

      {/* Digit Menu Builder */}
      <div>
        <Label className="mb-2 block">Digit Menu</Label>
        {Object.entries(form.menu_json).length === 0 && (
          <p className="text-sm text-slate-400 mb-2">No menu entries yet. Add digits below.</p>
        )}
        {Object.entries(form.menu_json).sort().map(([digit, dest]) => (
          <div key={digit} className="flex items-center gap-3 p-3 mb-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-8 h-8 bg-violet-100 text-violet-700 font-bold rounded-lg flex items-center justify-center flex-shrink-0">
              {digit}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{dest.label || dest.type}</p>
              <p className="text-xs text-slate-500 capitalize">{dest.type}{dest.id ? ` · ID: ${dest.id.slice(0, 8)}...` : ''}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => removeMenuItem(digit)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {/* Add new digit */}
        <div className="flex gap-2 mt-2 p-3 bg-violet-50 border border-violet-100 rounded-lg">
          <Select value={newDigit} onValueChange={setNewDigit}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIGITS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newDestType} onValueChange={v => { setNewDestType(v); setNewDestId(''); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="queue">Queue</SelectItem>
              <SelectItem value="extension">Extension</SelectItem>
              <SelectItem value="voicemail">Voicemail</SelectItem>
            </SelectContent>
          </Select>
          {destOptions.length > 0 && (
            <Select value={newDestId} onValueChange={setNewDestId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                {destOptions.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name || d.display_name} {d.extension_number ? `(${d.extension_number})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input placeholder="Label e.g. Reception" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="flex-1" />
          <Button variant="outline" onClick={addMenuItem}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isSaving || !form.name}>
          {isSaving ? 'Saving...' : 'Save IVR'}
        </Button>
      </div>
    </div>
  );
}