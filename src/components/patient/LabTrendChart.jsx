import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (payload.isAbnormal) {
    return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
  }
  return <circle cx={cx} cy={cy} r={4} fill="#0d9488" stroke="#fff" strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload, unit, normalMin, normalMax }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{format(new Date(p.date), 'MMM d, yyyy')}</p>
      <p className={`font-bold text-base ${p.isAbnormal ? 'text-red-600' : 'text-teal-700'}`}>
        {p.value} {unit}
      </p>
      {normalMin != null && normalMax != null && (
        <p className="text-xs text-slate-400 mt-1">Normal: {normalMin}–{normalMax} {unit}</p>
      )}
    </div>
  );
};

export default function LabTrendChart({ testCode, testName, results, normalMin, normalMax, unit }) {
  const chartData = [...results]
    .sort((a, b) => new Date(a.result_date) - new Date(b.result_date))
    .map(r => ({ date: r.result_date, value: r.value, isAbnormal: r.is_abnormal }));

  if (chartData.length === 0) return null;

  const latest = chartData[chartData.length - 1];
  const prev = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const delta = prev ? latest.value - prev.value : null;

  const TrendIcon = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta === null ? 'text-slate-400'
    : latest.isAbnormal ? 'text-red-500'
    : delta > 0 ? 'text-amber-500'
    : 'text-teal-500';

  // Compute Y-axis domain with padding
  const vals = chartData.map(d => d.value);
  const allVals = [...vals, normalMin, normalMax].filter(v => v != null);
  const domainMin = Math.min(...allVals) * 0.85;
  const domainMax = Math.max(...allVals) * 1.15;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">{testName}</p>
            {normalMin != null && normalMax != null && (
              <p className="text-xs text-slate-400 mt-0.5">Normal: {normalMin}–{normalMax} {unit}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {latest.isAbnormal && (
              <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs px-1.5 py-0.5">
                <AlertTriangle className="w-3 h-3 mr-1" />Abnormal
              </Badge>
            )}
            <div className={`flex items-center gap-1 text-sm font-bold ${latest.isAbnormal ? 'text-red-600' : 'text-teal-700'}`}>
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              {latest.value} {unit}
            </div>
          </div>
        </div>
        {delta !== null && (
          <p className={`text-xs mt-1 ${trendColor}`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta).toFixed(2)} {unit} from last reading
          </p>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-0">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={d => { try { return format(new Date(d), 'MMM d'); } catch { return d; } }}
              style={{ fontSize: '11px' }}
              tick={{ fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[domainMin, domainMax]}
              style={{ fontSize: '11px' }}
              tick={{ fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip unit={unit} normalMin={normalMin} normalMax={normalMax} />} />

            {/* Shaded normal range band */}
            {normalMin != null && normalMax != null && (
              <ReferenceArea y1={normalMin} y2={normalMax} fill="#d1fae5" fillOpacity={0.4} />
            )}
            {normalMin != null && <ReferenceLine y={normalMin} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1} />}
            {normalMax != null && <ReferenceLine y={normalMax} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1} />}

            <Line
              type="monotone"
              dataKey="value"
              stroke="#0d9488"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 7, stroke: '#0d9488', strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-slate-400 mt-1">{chartData.length} reading{chartData.length !== 1 ? 's' : ''}</p>
      </CardContent>
    </Card>
  );
}