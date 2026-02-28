/**
 * SipRequirementsPanel
 * Sri Lanka SIP onboarding requirements form.
 * Captures requirements for the SIP provider before provisioning.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Info } from 'lucide-react';

const DISTRICT_OPTIONS = [
  { value: '011', label: '011 — Colombo' },
  { value: '031', label: '031 — Negombo' },
  { value: '038', label: '038 — Panadura' },
  { value: '033', label: '033 — Gampaha' },
  { value: '081', label: '081 — Kandy' },
  { value: '041', label: '041 — Matara' },
  { value: '091', label: '091 — Galle' },
  { value: 'other', label: 'Other district' },
];

const ONBOARDING_CHECKLIST = [
  'Business registration certificate (copy)',
  'Telecom Regulatory Commission (TRC) proof of registration',
  'Company address for service delivery',
  'Primary technical contact email + mobile',
  'Expected call volume (inbound/outbound per day)',
  'Emergency service (119) routing preference',
];

export default function SipRequirementsPanel({ value = {}, onChange }) {
  const set = (field, val) => onChange({ ...value, [field]: val });

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-slate-500" />
          <CardTitle className="text-base">Sri Lanka SIP Onboarding Requirements</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Checklist */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-sm font-medium text-blue-800">Documents needed for SIP provisioning</p>
          </div>
          <ul className="space-y-1">
            {ONBOARDING_CHECKLIST.map((item, i) => (
              <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                <span className="mt-0.5 text-blue-400">•</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Desired DID Count</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 3"
              value={value.desired_did_count || ''}
              onChange={e => set('desired_did_count', parseInt(e.target.value) || null)}
            />
            <p className="text-xs text-slate-400 mt-1">Number of phone lines needed</p>
          </div>
          <div>
            <Label>Concurrent Channels</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 10"
              value={value.desired_concurrent_channels || ''}
              onChange={e => set('desired_concurrent_channels', parseInt(e.target.value) || null)}
            />
            <p className="text-xs text-slate-400 mt-1">Max simultaneous calls</p>
          </div>
        </div>

        <div>
          <Label>Area Code / District Preference</Label>
          <Select value={value.district_preference || ''} onValueChange={v => set('district_preference', v)}>
            <SelectTrigger><SelectValue placeholder="Select area code" /></SelectTrigger>
            <SelectContent>
              {DISTRICT_OPTIONS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-800">Fax DID Required</p>
              <p className="text-xs text-slate-500">Dedicated fax number (T.38 capable)</p>
            </div>
            <Switch
              checked={value.want_fax_did === true}
              onCheckedChange={v => set('want_fax_did', v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-800">Number Portability</p>
              <p className="text-xs text-slate-500">Port existing numbers to new SIP trunk</p>
            </div>
            <Switch
              checked={value.want_portability === true}
              onCheckedChange={v => set('want_portability', v)}
            />
          </div>
        </div>

        <div>
          <Label>Additional Notes</Label>
          <Input
            placeholder="Any specific requirements or constraints..."
            value={value.notes || ''}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}