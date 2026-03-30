import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Download, Clock, Users, TrendingUp, Calendar } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToHours(mins) {
  return Math.round((mins / 60) * 10) / 10;
}

const COLORS = ['#0d9488', '#7c3aed', '#2563eb', '#d97706', '#dc2626', '#059669', '#db2777'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-900 mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: <strong>{entry.value}h</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function HomeCareAnalyticsDashboard({ schedules, staff }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [chartMode, setChartMode] = useState('monthly'); // 'monthly' | 'staff'

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  // --- Compute hours per staff per month ---
  const completedSchedules = useMemo(() =>
    schedules.filter(s => !['cancelled'].includes(s.status) && s.schedule_date?.startsWith(selectedYear)),
    [schedules, selectedYear]
  );

  const staffMap = useMemo(() => {
    const m = {};
    staff.forEach(s => { m[s.id] = `${s.first_name || ''} ${s.last_name || ''}`.trim(); });
    return m;
  }, [staff]);

  // All 12 months for the selected year
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Number(selectedYear), i, 1);
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM') };
  });

  // hours[staffId][monthKey] = total hours
  const hoursMatrix = useMemo(() => {
    const matrix = {};
    completedSchedules.forEach(s => {
      if (!s.staff_id || !s.schedule_date) return;
      const monthKey = s.schedule_date.slice(0, 7);
      const mins = timeToMinutes(s.time_to) - timeToMinutes(s.time_from);
      if (mins <= 0) return;
      if (!matrix[s.staff_id]) matrix[s.staff_id] = {};
      matrix[s.staff_id][monthKey] = (matrix[s.staff_id][monthKey] || 0) + mins;
    });
    return matrix;
  }, [completedSchedules]);

  // ---- Monthly chart data: each month = one bar group, each staff = a bar ----
  const monthlyChartData = useMemo(() =>
    months.map(({ key, label }) => {
      const row = { month: label };
      Object.keys(hoursMatrix).forEach(staffId => {
        const name = staffMap[staffId] || staffId.slice(-6);
        row[name] = minutesToHours(hoursMatrix[staffId][key] || 0);
      });
      return row;
    }),
    [hoursMatrix, months, staffMap]
  );

  // ---- Staff summary chart data: total hours per staff for the year ----
  const staffSummaryData = useMemo(() =>
    Object.entries(hoursMatrix).map(([staffId, monthData]) => ({
      name: staffMap[staffId] || staffId.slice(-6),
      hours: minutesToHours(Object.values(monthData).reduce((a, b) => a + b, 0)),
      visits: completedSchedules.filter(s => s.staff_id === staffId).length,
    })).sort((a, b) => b.hours - a.hours),
    [hoursMatrix, staffMap, completedSchedules]
  );

  const staffKeys = Object.keys(hoursMatrix).map(id => staffMap[id] || id.slice(-6));

  // KPI totals
  const totalHours = minutesToHours(
    completedSchedules.reduce((sum, s) => {
      const mins = timeToMinutes(s.time_to) - timeToMinutes(s.time_from);
      return sum + (mins > 0 ? mins : 0);
    }, 0)
  );
  const totalVisits = completedSchedules.length;
  const avgHoursPerVisit = totalVisits > 0 ? Math.round((totalHours / totalVisits) * 10) / 10 : 0;
  const activeStaffCount = Object.keys(hoursMatrix).length;

  // ---- CSV Export ----
  function exportCSV() {
    const rows = [
      ['Staff Name', ...months.map(m => m.label + ' (' + selectedYear + ')'), 'Total Hours', 'Total Visits']
    ];
    staffSummaryData.forEach(({ name, hours, visits }) => {
      const staffId = Object.keys(staffMap).find(id => staffMap[id] === name);
      const monthHours = months.map(({ key }) =>
        staffId ? minutesToHours(hoursMatrix[staffId]?.[key] || 0) : 0
      );
      rows.push([name, ...monthHours, hours, visits]);
    });
    // Totals row
    const totalsRow = ['TOTAL'];
    months.forEach(({ key }) => {
      const total = Object.values(hoursMatrix).reduce((sum, monthData) => sum + (monthData[key] || 0), 0);
      totalsRow.push(minutesToHours(total));
    });
    totalsRow.push(totalHours, totalVisits);
    rows.push(totalsRow);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homecare-hours-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setChartMode('monthly')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${chartMode === 'monthly' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >Monthly Breakdown</button>
            <button
              onClick={() => setChartMode('staff')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${chartMode === 'staff' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >By Staff</button>
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Hours ({selectedYear})</p>
              <p className="text-2xl font-bold text-teal-700">{totalHours}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Visits</p>
              <p className="text-2xl font-bold text-purple-700">{totalVisits}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg Hours/Visit</p>
              <p className="text-2xl font-bold text-blue-700">{avgHoursPerVisit}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Staff</p>
              <p className="text-2xl font-bold text-amber-700">{activeStaffCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {chartMode === 'monthly'
              ? `Monthly Hours Breakdown — ${selectedYear}`
              : `Total Hours by Staff — ${selectedYear}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalHours === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No schedule data for {selectedYear}</p>
            </div>
          ) : chartMode === 'monthly' ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {staffKeys.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === staffKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={staffSummaryData} layout="vertical" margin={{ top: 4, right: 40, left: 100, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} unit="h" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={96} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                  {staffSummaryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-staff table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Staff Hours Detail — {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Staff</th>
                  {months.map(m => (
                    <th key={m.key} className="text-center px-2 py-3 font-semibold text-slate-600 text-xs whitespace-nowrap">{m.label}</th>
                  ))}
                  <th className="text-center px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Visits</th>
                </tr>
              </thead>
              <tbody>
                {staffSummaryData.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-center py-8 text-slate-400">No data</td>
                  </tr>
                ) : (
                  staffSummaryData.map(({ name, hours, visits }, rowIdx) => {
                    const staffId = Object.keys(staffMap).find(id => staffMap[id] === name);
                    return (
                      <tr key={name} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: COLORS[rowIdx % COLORS.length] }} />
                            {name}
                          </div>
                        </td>
                        {months.map(({ key }) => {
                          const h = staffId ? minutesToHours(hoursMatrix[staffId]?.[key] || 0) : 0;
                          return (
                            <td key={key} className="text-center px-2 py-2 text-slate-600 text-xs">
                              {h > 0 ? <span className="font-medium">{h}h</span> : <span className="text-slate-300">—</span>}
                            </td>
                          );
                        })}
                        <td className="text-center px-4 py-2 font-bold text-teal-700">{hours}h</td>
                        <td className="text-center px-4 py-2">
                          <Badge variant="outline" className="text-xs">{visits}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Totals row */}
                {staffSummaryData.length > 0 && (
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                    <td className="px-4 py-2 text-slate-800">Total</td>
                    {months.map(({ key }) => {
                      const total = minutesToHours(
                        Object.values(hoursMatrix).reduce((sum, md) => sum + (md[key] || 0), 0)
                      );
                      return (
                        <td key={key} className="text-center px-2 py-2 text-xs text-slate-700">
                          {total > 0 ? `${total}h` : <span className="text-slate-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="text-center px-4 py-2 text-teal-700">{totalHours}h</td>
                    <td className="text-center px-4 py-2 text-slate-700">{totalVisits}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}