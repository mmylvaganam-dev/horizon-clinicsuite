import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, Users, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

function calcDurationMinutes(appt) {
  if (!appt.consultation_started_at || !appt.consultation_ended_at) return null;
  const diff = new Date(appt.consultation_ended_at) - new Date(appt.consultation_started_at);
  return Math.round(diff / 60000);
}

export default function ReportKPIs({ appointments }) {
  const completed = appointments.filter(a => a.status === 'COMPLETED');
  const cancelled = appointments.filter(a => a.status === 'CANCELLED');
  const noShow = appointments.filter(a => a.status === 'NO_SHOW');
  const total = appointments.length;

  const durations = completed.map(calcDurationMinutes).filter(d => d !== null && d > 0);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null;

  const totalRevenue = completed.reduce((s, a) => s + (a.billing_amount_usd || 0), 0);
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const noShowRate = total > 0 ? Math.round((noShow.length / total) * 100) : 0;

  const kpis = [
    {
      label: 'Total Consultations',
      value: total,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      sub: `${completed.length} completed`,
    },
    {
      label: 'Avg. Duration',
      value: avgDuration ? `${avgDuration} min` : '—',
      icon: Clock,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      sub: `from ${durations.length} timed sessions`,
    },
    {
      label: 'No-Show Rate',
      value: `${noShowRate}%`,
      icon: AlertCircle,
      color: noShowRate > 15 ? 'text-red-600' : 'text-orange-500',
      bg: noShowRate > 15 ? 'bg-red-50' : 'bg-orange-50',
      sub: `${noShow.length} no-shows`,
    },
    {
      label: 'Revenue (USD)',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      sub: `from ${completed.length} paid consults`,
    },
    {
      label: 'Cancellations',
      value: cancelled.length,
      icon: TrendingUp,
      color: 'text-slate-500',
      bg: 'bg-slate-50',
      sub: `${total > 0 ? Math.round((cancelled.length / total) * 100) : 0}% of total`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map(k => (
        <Card key={k.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className={`${k.bg} rounded-lg p-2 w-fit mb-2`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{k.label}</p>
            {k.sub && <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}