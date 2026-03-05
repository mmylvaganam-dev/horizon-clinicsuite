import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportCharts({ appointments, providers }) {
  // Consultations by day
  const byDay = {};
  appointments.forEach(a => {
    if (!a.scheduled_time) return;
    const day = format(parseISO(a.scheduled_time), 'MMM d');
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const dailyData = Object.entries(byDay).map(([date, count]) => ({ date, count }));

  // By provider
  const byProvider = {};
  appointments.forEach(a => {
    const name = a.provider_name || 'Unknown';
    byProvider[name] = (byProvider[name] || 0) + 1;
  });
  const providerData = Object.entries(byProvider).map(([name, value]) => ({ name, value }));

  // By type
  const byType = {};
  appointments.forEach(a => {
    const t = a.appointment_type || 'CONSULTATION';
    byType[t] = (byType[t] || 0) + 1;
  });
  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  // By region
  const byRegion = {};
  appointments.forEach(a => {
    const r = a.patient_region || 'OTHER';
    byRegion[r] = (byRegion[r] || 0) + 1;
  });
  const regionData = Object.entries(byRegion).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Daily volume */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Daily Consultation Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By provider */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Consultations by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {providerData.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={providerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {providerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By appointment type */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">By Consultation Type</CardTitle>
        </CardHeader>
        <CardContent>
          {typeData.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By patient region */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Patient Region (CrossBorder Utilization)</CardTitle>
        </CardHeader>
        <CardContent>
          {regionData.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={regionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                  {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}