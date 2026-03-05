import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import ReportFilters from '@/components/telemedicine/ReportFilters';
import ReportKPIs from '@/components/telemedicine/ReportKPIs';
import ReportCharts from '@/components/telemedicine/ReportCharts';
import ReportExport from '@/components/telemedicine/ReportExport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart2 } from 'lucide-react';

const STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-500',
};

const defaultFrom = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
const defaultTo = format(new Date(), 'yyyy-MM-dd');

export default function TeleReports() {
  const [filters, setFilters] = useState({
    dateFrom: defaultFrom,
    dateTo: defaultTo,
    providerId: 'all',
    apptType: 'all',
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['teleAppointmentsAll'],
    queryFn: () => base44.entities.TeleAppointment.list('-scheduled_time', 500),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['teleProviders'],
    queryFn: () => base44.entities.TeleProvider.list(),
  });

  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (!a.scheduled_time) return false;
      const date = parseISO(a.scheduled_time);
      if (filters.dateFrom && date < startOfDay(parseISO(filters.dateFrom))) return false;
      if (filters.dateTo && date > endOfDay(parseISO(filters.dateTo))) return false;
      if (filters.providerId !== 'all' && a.provider_id !== filters.providerId) return false;
      if (filters.apptType !== 'all' && a.appointment_type !== filters.apptType) return false;
      return true;
    });
  }, [appointments, filters]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-teal-600" />
            Telemedicine Reports
          </h1>
          <p className="text-slate-500 text-sm">CrossBorder Health Network — consultation analytics &amp; exports</p>
        </div>
        <ReportExport appointments={filtered} />
      </div>

      <ReportFilters filters={filters} setFilters={setFilters} providers={providers} />

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading data...</p>
      ) : (
        <>
          <div className="text-xs text-slate-500">
            Showing <strong>{filtered.length}</strong> appointment(s) matching your filters
          </div>

          <ReportKPIs appointments={filtered} />
          <ReportCharts appointments={filtered} providers={providers} />

          {/* Data Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Appointment Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-500">
                      <th className="text-left px-4 py-2 font-medium">Date & Time</th>
                      <th className="text-left px-4 py-2 font-medium">Patient</th>
                      <th className="text-left px-4 py-2 font-medium">Provider</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Region</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-right px-4 py-2 font-medium">USD</th>
                      <th className="text-left px-4 py-2 font-medium">Billing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map(a => (
                      <tr key={a.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                          {a.scheduled_time ? format(parseISO(a.scheduled_time), 'MMM d, yyyy HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-800">{a.patient_name || '—'}</td>
                        <td className="px-4 py-2 text-slate-600">{a.provider_name || '—'}</td>
                        <td className="px-4 py-2 text-slate-500">{a.appointment_type || 'CONSULTATION'}</td>
                        <td className="px-4 py-2 text-slate-500">{a.patient_region || '—'}</td>
                        <td className="px-4 py-2">
                          <Badge className={`${STATUS_COLORS[a.status] || 'bg-slate-100'} border-0 text-xs`}>
                            {a.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-700">${a.billing_amount_usd || 0}</td>
                        <td className="px-4 py-2 text-slate-500 capitalize">{a.billing_status || '—'}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400">No records match the selected filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filtered.length > 100 && (
                  <p className="text-xs text-slate-400 px-4 py-2">Showing first 100 rows. Export CSV/PDF for full dataset.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}