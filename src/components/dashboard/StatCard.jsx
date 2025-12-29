import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'teal' }) {
  const colorStyles = {
    teal: 'from-teal-500 to-teal-600 shadow-teal-500/25',
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    violet: 'from-violet-500 to-violet-600 shadow-violet-500/25',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/25',
    rose: 'from-rose-500 to-rose-600 shadow-rose-500/25',
  };

  return (
    <Card className="relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
            {trend && (
              <div className={`inline-flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <span>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
                <span className="text-slate-400">vs last month</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorStyles[color]} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colorStyles[color]}`} />
    </Card>
  );
}