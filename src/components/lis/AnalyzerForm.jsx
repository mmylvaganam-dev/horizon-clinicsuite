import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const ANALYZER_TYPES = ['chemistry', 'hematology', 'immunoassay', 'microbiology', 'molecular', 'other'];
const INTERFACE_TYPES = ['hl7', 'astm', 'csv', 'api', 'manual'];

export default function AnalyzerForm({ open, onOpenChange, analyzer, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    analyzer_name: '', serial_number: '', manufacturer: '',
    analyzer_type: 'chemistry', interface_type: 'hl7',
    status: 'active', notes: '',
    last_maintenance: '', next_maintenance: '',
  });

  useEffect(() => {
    if (analyzer) {
      setForm({
        analyzer_name: analyzer.analyzer_name || '',
        serial_number: analyzer.serial_number || '',
        manufacturer: analyzer.manufacturer || '',
        analyzer_type: analyzer.analyzer_type || 'chemistry',
        interface_type: analyzer.interface_type || 'hl7',
        status: analyzer.status || 'active',
        notes: analyzer.notes || '',
        last_maintenance: analyzer.last_maintenance || '',
        next_maintenance: analyzer.next_maintenance || '',
      });
    } else {
      setForm({ analyzer_name: '', serial_number: '', manufacturer: '', analyzer_type: 'chemistry', interface_type: 'hl7', status: 'active', notes: '', last_maintenance: '', next_maintenance: '' });
    }
  }, [analyzer, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{analyzer ? 'Edit Analyzer' : 'Add New Analyzer'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Analyzer Name / Model *</Label>
              <Input value={form.analyzer_name} onChange={e => set('analyzer_name', e.target.value)} placeholder="e.g. Sysmex XN-550" />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Sysmex" />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="e.g. SN-1234567" />
            </div>
            <div>
              <Label>Analyzer Type *</Label>
              <Select value={form.analyzer_type} onValueChange={v => set('analyzer_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANALYZER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interface Protocol *</Label>
              <Select value={form.interface_type} onValueChange={v => set('interface_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERFACE_TYPES.map(t => <SelectItem key={t} value={t} className="uppercase">{t.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Last Maintenance</Label>
              <Input type="date" value={form.last_maintenance} onChange={e => set('last_maintenance', e.target.value)} />
            </div>
            <div>
              <Label>Next Maintenance</Label>
              <Input type="date" value={form.next_maintenance} onChange={e => set('next_maintenance', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Location, IP address, connection notes..." />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!form.analyzer_name || isLoading}
              onClick={() => onSubmit(form)}
            >
              {isLoading ? 'Saving...' : analyzer ? 'Save Changes' : 'Add Analyzer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}