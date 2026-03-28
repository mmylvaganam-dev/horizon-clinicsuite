import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar
} from 'recharts';
import { format, subDays, subMonths, isAfter } from 'date-fns';
import {
  Activity, Heart, Weight, Thermometer, Wind, TrendingUp,
  TrendingDown, Minus, AlertTriangle, BarChart2, Droplets, Eye
} from 'lucide-react';

const RANGE_OPTIONS = [
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
  { label: 'All Time', days: 9999 },
];

const VITAL_METRICS = [
  {
    key: 'bp', label: 'Blood Pressure', icon: Heart, color: '#ef4444', unit: 'mmHg',
    fields: ['BP_sys', 'BP_dia'],
    normalSys: [90, 120], normalDia: [60, 80],
    description: 'Systolic / Diastolic',
  },
  {
    key: 'hr', label: 'Heart Rate', icon: Activity, color: '#f97316', unit: 'bpm',
    fields: ['HR'], normal: [60, 100],
  },
  {
    key: 'weight', label: 'Weight', icon: Weight, color: '#8b5cf6', unit: 'kg',
    fields: ['Weight'],
  },
  {
    key: 'bmi', label: 'BMI', icon: BarChart2, color: '#0891b2', unit: '',
    fields: ['BMI'], normal: [18.5, 24.9],
  },
  {
    key: 'spo2', label: 'Oxygen Saturation', icon: Droplets, color: '#2563eb', unit: '%',
    fields: ['SpO2'], normal: [95, 100],
  },
  {
    key: 'temp', label: 'Temperature', icon: Thermometer, color: '#dc2626', unit: '°C',
    fields: ['Temp'], normal: [36.1, 37.2],
  },
  {
    key: 'rr', label: 'Respiratory Rate', icon: Wind, color: '#059669', unit: '/min',
    fields: ['RR'], normal: [12, 20],
  },
];

function TrendIndicator({ data, field }) {
  if (!data || data.length < 2) return <Minus className="w-4 h-4 text-slate-400" />;
  const last = data[data.length - 1]?.[field];
  const prev = data[data.length - 2]?.[field];
  if (last == null || prev == null) return null;
  const diff = last - prev;
  if (Math.abs(diff) < 0.5) return <Minus className="w-4 h-4 text-slate-400" />;
  if (diff > 0) return <TrendingUp className="w-4 h-4 text-rose-500" />;
  return <TrendingDown className="w-4 h-4 text-emerald-500" />;
}

function StatusBadge({ value, normal }) {
  if (!normal || value == null) return null;
  const [lo, hi] = normal;
  if (value < lo) return <Badge className="bg-blue-100 text-blue-700 text-xs">Low</Badge>;
  if (value > hi) return <Badge className="bg-rose-100 text-rose-700 text-xs">High</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 text-xs">Normal</Badge>;
}

function MetricCard({ metric, data, rangeLabel }) {
  const latestPoint = data[data.length - 1];
  const field = metric.fields[0];
  const latestValue = latestPoint?.[field];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 text-sm">
        <p className="font-semibold text-slate-700 mb-2">{label}</p>
        {metric.key === 'bp' ? (
          <>
            <p className="text-rose-600">Systolic: <span className="font-bold">{payload.find(p => p.dataKey === 'BP_sys')?.value} mmHg</span></p>
            <p className="text-blue-600">Diastolic: <span className="font-bold">{payload.find(p => p.dataKey === 'BP_dia')?.value} mmHg</span></p>
          </>
        ) : (
          <p style={{ color: metric.color }}>
            {metric.label}: <span className="font-bold">{payload[0]?.value} {metric.unit}</span>
          </p>
        )}
      </div>
    );
  };

  if (!data.length) {
    return (
      <Card className="border border-slate-100 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <metric.icon className="w-8 h-8 text-slate-300" />
          <p className="text-sm">No {metric.label} data recorded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: metric.color + '18' }}>
              <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-700">{metric.label}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {metric.key === 'bp' ? (
              <span className="text-base font-bold text-slate-900">
                {latestPoint?.BP_sys ?? '—'}/{latestPoint?.BP_dia ?? '—'}
                <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
              </span>
            ) : (
              <span className="text-base font-bold text-slate-900">
                {latestValue != null ? latestValue : '—'}
                <span className="text-xs font-normal text-slate-500 ml-1">{metric.unit}</span>
              </span>
            )}
            <TrendIndicator data={data} field={field} />
            {metric.normal && <StatusBadge value={latestValue} normal={metric.normal} />}
          </div>
        </div>
        <p className="text-xs text-slate-400 pl-10">{data.length} readings · {rangeLabel}</p>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <ResponsiveContainer width="100%" height={140}>
          {metric.key === 'bp' ? (
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={120} stroke="#94a3b8" strokeDasharray="4 4" />
              <ReferenceLine y={80} stroke="#cbd5e1" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="BP_sys" fill="#fee2e2" stroke="#ef4444" strokeWidth={2} dot={false} name="Systolic" />
              <Line type="monotone" dataKey="BP_dia" stroke="#3b82f6" strokeWidth={2} dot={false} name="Diastolic" />
            </ComposedChart>
          ) : (
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip content={<CustomTooltip />} />
              {metric.normal && (
                <>
                  <ReferenceLine y={metric.normal[0]} stroke="#94a3b8" strokeDasharray="4 4" />
                  <ReferenceLine y={metric.normal[1]} stroke="#94a3b8" strokeDasharray="4 4" />
                </>
              )}
              <Area
                type="monotone"
                dataKey={field}
                stroke={metric.color}
                strokeWidth={2}
                fill={`url(#grad-${metric.key})`}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isAbnormal = metric.normal && payload[field] != null &&
                    (payload[field] < metric.normal[0] || payload[field] > metric.normal[1]);
                  return <circle key={cx} cx={cx} cy={cy} r={isAbnormal ? 5 : 3}
                    fill={isAbnormal ? '#ef4444' : metric.color} stroke="#fff" strokeWidth={1.5} />;
                }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function LabTrendMini({ testName, entries }) {
  const sorted = [...entries].sort((a, b) => new Date(a.entered_at || a.created_date) - new Date(b.entered_at || b.created_date));
  const latest = sorted[sorted.length - 1];
  const isAbnormal = latest?.is_abnormal;

  const data = sorted.map(e => ({
    dateLabel: format(new Date(e.entered_at || e.created_date), 'MMM d'),
    value: e.value_numeric,
    isAbnormal: e.is_abnormal,
  })).filter(d => d.value != null);

  if (data.length < 2) return null;

  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700">{testName}</CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-slate-900">
              {latest?.value_numeric} <span className="text-xs font-normal text-slate-400">{latest?.unit}</span>
            </span>
            {isAbnormal && <Badge className="bg-rose-100 text-rose-700 text-xs"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Abnormal</Badge>}
            {!isAbnormal && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Normal</Badge>}
          </div>
        </div>
        {latest?.reference_range_text && (
          <p className="text-xs text-slate-400">Ref: {latest.reference_range_text} {latest.unit}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip formatter={(v) => [`${v} ${latest?.unit}`, testName]} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={payload.isAbnormal ? 5 : 3}
                  fill={payload.isAbnormal ? '#ef4444' : '#6366f1'} stroke="#fff" strokeWidth={1.5} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function HealthMetricsDashboard({ patientId }) {
  const [rangeDays, setRangeDays] = useState(180);
  const [activeSection, setActiveSection] = useState('vitals');

  const { data: vitals = [] } = useQuery({
    queryKey: ['patientVitals', patientId],
    queryFn: () => base44.entities.PatientVital.filter({ patient_ref: patientId }, 'recorded_at'),
    enabled: !!patientId,
  });

  const { data: labEntries = [] } = useQuery({
    queryKey: ['labResultEntries', patientId],
    queryFn: async () => {
      // Get orders for this patient
      const orders = await base44.entities.Order.filter({ patient_id: patientId });
      if (!orders.length) return [];
      const orderIds = orders.map(o => o.id);
      // Get results for those orders
      const results = await base44.entities.Result.filter({ patient_id: patientId });
      if (!results.length) return [];
      const resultIds = results.map(r => r.id);
      // Get entries
      const allEntries = await Promise.all(
        resultIds.slice(0, 20).map(rid => base44.entities.LabResultEntry.filter({ result_id: rid }))
      );
      return allEntries.flat();
    },
    enabled: !!patientId,
  });

  const cutoff = useMemo(() => subDays(new Date(), rangeDays), [rangeDays]);

  const filteredVitals = useMemo(() =>
    vitals
      .filter(v => isAfter(new Date(v.recorded_at), cutoff))
      .map(v => ({
        ...v,
        dateLabel: format(new Date(v.recorded_at), 'MMM d'),
      }))
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)),
    [vitals, cutoff]
  );

  // Group lab entries by test_name, only numeric ones with ≥2 readings
  const labTrends = useMemo(() => {
    const byTest = {};
    labEntries
      .filter(e => e.value_numeric != null && isAfter(new Date(e.entered_at || e.created_date), cutoff))
      .forEach(e => {
        const key = e.test_name || e.test_code;
        if (!byTest[key]) byTest[key] = [];
        byTest[key].push(e);
      });
    return Object.entries(byTest)
      .filter(([, entries]) => entries.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);
  }, [labEntries, cutoff]);

  const rangeLabel = RANGE_OPTIONS.find(r => r.days === rangeDays)?.label || '';

  // Summary stats
  const lastVital = filteredVitals[filteredVitals.length - 1];
  const summaryCards = [
    { label: 'BP', value: lastVital?.BP_sys && lastVital?.BP_dia ? `${lastVital.BP_sys}/${lastVital.BP_dia}` : '—', unit: 'mmHg', color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'HR', value: lastVital?.HR ?? '—', unit: 'bpm', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Weight', value: lastVital?.Weight ?? '—', unit: 'kg', color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'BMI', value: lastVital?.BMI ?? '—', unit: '', color: 'text-cyan-700', bg: 'bg-cyan-50' },
    { label: 'SpO₂', value: lastVital?.SpO2 ?? '—', unit: '%', color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Temp', value: lastVital?.Temp ?? '—', unit: '°C', color: 'text-red-700', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-teal-600" />
            Health Trends Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredVitals.length} vital readings · {labTrends.length} tracked lab parameters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(r => (
                <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setActiveSection('vitals')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${activeSection === 'vitals' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Vitals
            </button>
            <button
              onClick={() => setActiveSection('labs')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${activeSection === 'labs' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Labs
            </button>
          </div>
        </div>
      </div>

      {/* Latest Vitals Summary Bar */}
      {lastVital && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {summaryCards.map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
              <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              {s.unit && <p className="text-xs text-slate-400">{s.unit}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Vitals Section */}
      {activeSection === 'vitals' && (
        <>
          {filteredVitals.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Activity className="w-12 h-12 text-slate-300" />
                <div className="text-center">
                  <p className="font-medium text-slate-600">No vitals recorded in this period</p>
                  <p className="text-sm mt-1">Vitals are recorded through encounters or manually entered.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VITAL_METRICS.map(metric => (
                <MetricCard
                  key={metric.key}
                  metric={metric}
                  data={filteredVitals}
                  rangeLabel={rangeLabel}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Labs Section */}
      {activeSection === 'labs' && (
        <>
          {labTrends.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Eye className="w-12 h-12 text-slate-300" />
                <div className="text-center">
                  <p className="font-medium text-slate-600">No lab trend data available</p>
                  <p className="text-sm mt-1">Lab trends appear when a test has been ordered at least twice in this period.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {labTrends.map(([testName, entries]) => (
                <LabTrendMini key={testName} testName={testName} entries={entries} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}