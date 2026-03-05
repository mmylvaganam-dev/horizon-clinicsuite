import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, ArrowUpDown } from 'lucide-react';

export default function PrescriptionFilters({ filters, onChange, patients = [] }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  const clear = () => onChange({
    search: '',
    status: 'all',
    patientId: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'prescribed_date',
    sortDir: 'desc',
  });

  const hasActive = filters.search || filters.status !== 'all' || filters.patientId !== 'all' || filters.dateFrom || filters.dateTo;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search drug, patient..."
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Status */}
        <Select value={filters.status} onValueChange={(v) => update('status', v)}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="Dispensed">Dispensed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Patient */}
        <Select value={filters.patientId} onValueChange={(v) => update('patientId', v)}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="Patient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update('dateFrom', e.target.value)}
          className="w-40 bg-white"
          placeholder="From"
        />

        {/* Date To */}
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update('dateTo', e.target.value)}
          className="w-40 bg-white"
          placeholder="To"
        />

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={clear} className="text-slate-500 gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Sort row */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Sort by:</span>
        <Select value={filters.sortBy} onValueChange={(v) => update('sortBy', v)}>
          <SelectTrigger className="w-44 bg-white h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prescribed_date">Date Prescribed</SelectItem>
            <SelectItem value="patient_name">Patient Name</SelectItem>
            <SelectItem value="drug_name">Drug Name</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sortDir} onValueChange={(v) => update('sortDir', v)}>
          <SelectTrigger className="w-32 bg-white h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}