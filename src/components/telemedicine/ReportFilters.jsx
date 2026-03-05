import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

export default function ReportFilters({ filters, setFilters, providers }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">From Date</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">To Date</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Provider</Label>
            <Select value={filters.providerId} onValueChange={v => setFilters(f => ({ ...f, providerId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Appointment Type</Label>
            <Select value={filters.apptType} onValueChange={v => setFilters(f => ({ ...f, apptType: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CONSULTATION">Consultation</SelectItem>
                <SelectItem value="SECOND_OPINION">Second Opinion</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                <SelectItem value="MEDICAL_TOURISM_PREP">Medical Tourism Prep</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}