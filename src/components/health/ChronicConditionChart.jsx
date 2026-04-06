import React from 'react';
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend, ReferenceArea
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function TrendBadge({ data, valueKey = 'value' }) {
  if (!data || data.length < 2) return null;
  const first = data[0]?.[valueKey];
  const last = data[data.length - 1]?.[valueKey];
  if (first == null || last == null) return null;
  const pct = (((last - first) / first) * 100).toFixed(1);
  const diff = (last - first).toFixed(1);
  if (Math.abs(diff) < 0.1) return <Badge className="bg-slate-100 text-slate-600 gap-1"><Minus className="w-3 h-3" /> Stable</Badge>;
  if (last > first) return <Badge className="bg-rose-100 text-rose-700 gap-1"><TrendingUp className="w-3 h-3" /> +{diff}</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 gap-1"><TrendingDown className="w-3 h-3" /> {diff}</Badge>;
}

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}{unit}</strong></p>
      ))}
    </div>
  );
};

export default function ChronicConditionChart({
  title,
  data = [],
  lines = [], // [{ key, label, color, strokeDash }]
  unit = '',
  targetMin,
  targetMax,
  targetLabel = 'Target Range',
  height = 200,
  latestValue,
  statusBadge, // null | 'normal' | 'warning' | 'critical'
}) {
  const borderColor = statusBadge === 'critical' ? 'border-red-300' : statusBadge === 'warning' ? 'border-amber-300' : 'border-slate-200';
  const headerBg = statusBadge === 'critical' ? 'bg-red-50' : statusBadge === 'warning' ? 'bg-amber-50' : '';

  return (
    <Card className={`border-2 ${borderColor} shadow-sm`}>
      <CardHeader className={`pb-2 pt-4 px-4 ${headerBg} rounded-t-lg`}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
            {latestValue != null && (
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {latestValue}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statusBadge === 'critical' && <Badge className="bg-red-100 text-red-700">Critical</Badge>}
            {statusBadge === 'warning' && <Badge className="bg-amber-100 text-amber-700">Out of Range</Badge>}
            {statusBadge === 'normal' && <Badge className="bg-emerald-100 text-emerald-700">Normal</Badge>}
            <TrendBadge data={data} valueKey={lines[0]?.key || 'value'} />
          </div>
        </div>
        {targetMin != null && targetMax != null && (
          <p className="text-xs text-slate-400 mt-0.5">{targetLabel}: {targetMin}–{targetMax} {unit}</p>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-1">
        {data.length === 0 ? (
          <div className="flex items-center justify-center text-xs text-slate-400" style={{ height }}>
            No data recorded yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              {targetMin != null && targetMax != null && (
                <ReferenceArea y1={targetMin} y2={targetMax} fill="#bbf7d0" fillOpacity={0.25} />
              )}
              {targetMax != null && (
                <ReferenceLine y={targetMax} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value: 'Max', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
              )}
              {targetMin != null && (
                <ReferenceLine y={targetMin} stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value: 'Min', position: 'insideBottomRight', fontSize: 9, fill: '#60a5fa' }} />
              )}
              {lines.map(line => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label || line.key}
                  stroke={line.color}
                  strokeWidth={2.5}
                  strokeDasharray={line.strokeDash}
                  dot={{ r: 4, fill: line.color, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
              {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}