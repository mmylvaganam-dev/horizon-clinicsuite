import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, Users } from 'lucide-react';
import { isToday, isThisWeek, parseISO } from 'date-fns';

export default function ProviderStatsBar({ appointments }) {
  const today = appointments.filter(a => a.scheduled_time && isToday(parseISO(a.scheduled_time)));
  const week = appointments.filter(a => a.scheduled_time && isThisWeek(parseISO(a.scheduled_time)));
  const completed = appointments.filter(a => a.status === 'COMPLETED');
  const completedToday = completed.filter(a => a.scheduled_time && isToday(parseISO(a.scheduled_time)));

  const stats = [
    { label: "Today's Appointments", value: today.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: "This Week", value: week.length, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: "Completed Today", value: completedToday.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: "Total Completed", value: completed.length, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <Card key={s.label} className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`${s.bg} rounded-lg p-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}