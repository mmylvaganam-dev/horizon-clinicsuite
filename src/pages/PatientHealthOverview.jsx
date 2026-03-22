import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine, YAxis, XAxis
} from 'recharts';
import { AlertTriangle, ArrowLeft, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { checkVital, THRESHOLDS } from '@/lib/vitalsThresholds';

// ------------------------------------------------------------------
// Config: which vitals to display on the overview
// ------------------------------------------------------------------
const VITAL_PANELS = [
  { key: 'HR',     label: 'Heart Rate',        unit: 'bpm',   color: '#ef4444', field: 'HR' },
  { key: 'BP',     label: 'Blood Pressure',    unit: 'mmHg',  color: '#3b82f6', isBP: true },
  { key: 'BMI',    label: 'BMI',               unit: '',      color: '#06b6d4', field: 'BMI' },
  { key: 'SpO2',   label: 'SpO2',              unit: '%',     color: '#14b8a6', field: 'SpO2' },
  { key: 'Temp',   label: 'Temperature',       unit: '°C',    color: '#f59e0b', field: 'Temp' },
  { key: 'Weight', label: 'Weight',            unit: 'kg',    color: '#8b5cf6', field: 'Weight', noThreshold: true },
  { key: 'RR',     label: 'Resp. Rate',        unit: '/min',  color: '#10b981', field: 'RR' },
  { key: 'HbA1c',  label: 'HbA1c',             unit: '%',     color: '#f97316', isLab: true },
];

// HbA1c thresholds
const HBAIC_THRESHOLD = { min: 4.0, max: 5.7 };

function checkBP(record) {
  const s = checkVital('BP_sys', record.BP_sys);
  const d = checkVital('BP_dia', record.BP_dia);
  if (s.severity === 'critical' || d.severity === 'critical') return 'critical';
  if (s.abnormal || d.abnormal) return 'warning';
  return null;
}

function TrendIndicator({ data, field, isBP }) {
  if (!data || data.length < 2) return <Minus className="w-4 h-4 text-slate-400" />;
  const latest  = isBP ? data[data.length - 1]?.sys : data[data.length - 1]?.[field];
  const prev    = isBP ? data[data.length - 2]?.sys : data[data.length - 2]?.[field];
  if (latest == null || prev == null) return <Minus className="w-4 h-4 text-slate-400" />;
  if (latest > prev) return <TrendingUp className="w-4 h-4 text-rose-500" />;
  if (latest < prev) return <TrendingDown className="w-4 h-4 text-emerald-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function MiniSparkline({ data, color, refMin, refMax }) {
  if (!data || data.length === 0) return (
    <div className="h-16 flex items-center justify-center text-xs text-slate-400">No data</div>
  );
  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={data}>
        <YAxis domain={['auto', 'auto']} hide />
        <XAxis dataKey="date" hide />
        <Tooltip
          content={({ active, payload }) => active && payload?.length ? (
            <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs shadow">
              <p className="font-semibold">{payload[0].value}</p>
              <p className="text-slate-400">{payload[0].payload.date}</p>
            </div>
          ) : null}
        />
        {refMin != null && <ReferenceLine y={refMin} stroke="#fbbf24" strokeDasharray="3 3" strokeWidth={1} />}
        {refMax != null && <ReferenceLine y={refMax} stroke="#fbbf24" strokeDasharray="3 3" strokeWidth={1} />}
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function VitalCard({ panel, vitals, hba1c }) {
  let sparkData = [];
  let latestDisplay = '—';
  let status = null; // null | 'warning' | 'critical'

  const sorted = [...vitals].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

  if (panel.isLab) {
    // HbA1c from lab results
    sparkData = hba1c.map(r => ({ date: format(new Date(r.date), 'MMM d'), value: r.value }));
    if (sparkData.length > 0) {
      const latest = hba1c[hba1c.length - 1].value;
      latestDisplay = `${latest}%`;
      if (latest > HBAIC_THRESHOLD.max) status = latest > 6.5 ? 'critical' : 'warning';
    }
  } else if (panel.isBP) {
    const bpData = sorted.filter(v => v.BP_sys != null && v.BP_dia != null);
    sparkData = bpData.map(v => ({
      date: format(new Date(v.recorded_at), 'MMM d'),
      value: v.BP_sys,
    }));
    if (bpData.length > 0) {
      const last = bpData[bpData.length - 1];
      latestDisplay = `${last.BP_sys}/${last.BP_dia}`;
      status = checkBP(last);
    }
  } else {
    const withData = sorted.filter(v => v[panel.field] != null);
    sparkData = withData.map(v => ({
      date: format(new Date(v.recorded_at), 'MMM d'),
      value: v[panel.field],
    }));
    if (withData.length > 0) {
      const latest = withData[withData.length - 1][panel.field];
      latestDisplay = `${latest}${panel.unit}`;
      if (!panel.noThreshold) {
        const check = checkVital(panel.key, latest);
        if (check.abnormal) status = check.severity;
      }
    }
  }

  const thresh = !panel.isBP && !panel.isLab && THRESHOLDS[panel.key];
  const borderClass = status === 'critical'
    ? 'border-red-400 bg-red-50'
    : status === 'warning'
    ? 'border-amber-400 bg-amber-50'
    : 'border-slate-200 bg-white';

  return (
    <Card className={`border-2 ${borderClass} transition-colors`}>
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-600">{panel.label}</CardTitle>
          <div className="flex items-center gap-1">
            {status === 'critical' && <Badge className="bg-red-100 text-red-700 border-0 text-xs">Critical</Badge>}
            {status === 'warning'  && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Out of Range</Badge>}
            {!status && sparkData.length > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Normal</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-2xl font-bold ${status === 'critical' ? 'text-red-700' : status === 'warning' ? 'text-amber-700' : 'text-slate-900'}`}>
            {latestDisplay}
          </span>
          <TrendIndicator data={sparkData} field="value" />
        </div>
        {thresh && (
          <p className="text-xs text-slate-400 mt-0.5">Normal: {thresh.min}–{thresh.max} {thresh.unit}</p>
        )}
        {panel.isLab && (
          <p className="text-xs text-slate-400 mt-0.5">Normal: {HBAIC_THRESHOLD.min}–{HBAIC_THRESHOLD.max}%</p>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <MiniSparkline
          data={sparkData}
          color={status ? (status === 'critical' ? '#ef4444' : '#f59e0b') : panel.color}
          refMin={panel.isLab ? HBAIC_THRESHOLD.min : thresh?.min}
          refMax={panel.isLab ? HBAIC_THRESHOLD.max : thresh?.max}
        />
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Main Page
// ------------------------------------------------------------------
export default function PatientHealthOverview() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patient');

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }).then(p => p[0]),
    enabled: !!patientId,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['patientVitals', patientId],
    queryFn: () => base44.entities.PatientVital.filter({ patient_ref: patientId }),
    enabled: !!patientId,
  });

  // Pull HbA1c from lab results (structured_json.test_results)
  const { data: labResults = [] } = useQuery({
    queryKey: ['patientLabResults', patientId],
    queryFn: () => base44.entities.Result.filter({ patient_id: patientId, result_type: 'LAB' }),
    enabled: !!patientId,
  });

  const hba1c = labResults
    .flatMap(r =>
      (r.structured_json?.test_results || [])
        .filter(t => /hba1c|hb a1c|a1c|glycated/i.test(t.test_name || t.test_code || ''))
        .map(t => ({ date: r.result_date, value: parseFloat(t.value) }))
        .filter(t => !isNaN(t.value))
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute all alerts from latest vitals entry
  const latestVital = vitals.length > 0
    ? vitals.reduce((a, b) => new Date(a.recorded_at) > new Date(b.recorded_at) ? a : b)
    : null;

  const alerts = [];
  if (latestVital) {
    const keys = ['HR', 'BP_sys', 'BP_dia', 'RR', 'Temp', 'SpO2', 'BMI'];
    keys.forEach(k => {
      const r = checkVital(k, latestVital[k]);
      if (r.abnormal) alerts.push({ ...r, key: k });
    });
  }
  if (hba1c.length > 0) {
    const latest = hba1c[hba1c.length - 1].value;
    if (latest > HBAIC_THRESHOLD.max) {
      alerts.push({
        abnormal: true,
        severity: latest > 6.5 ? 'critical' : 'warning',
        message: `HbA1c ${latest > HBAIC_THRESHOLD.max ? 'High' : 'Low'} (${latest}% — normal: ${HBAIC_THRESHOLD.min}–${HBAIC_THRESHOLD.max}%)`,
        key: 'HbA1c'
      });
    }
  }
  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings  = alerts.filter(a => a.severity === 'warning');

  if (!patientId) {
    return (
      <div className="p-8 text-center text-slate-500">
        No patient selected. Open this page from a patient record.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-600" />
            Health Overview
          </h1>
          {patient && (
            <p className="text-slate-500 text-sm mt-0.5">
              {patient.first_name} {patient.last_name}
              {patient.phn && <span className="ml-2 text-slate-400">· PHN: {patient.phn}</span>}
              {latestVital && (
                <span className="ml-2 text-slate-400">
                  · Last vitals: {format(new Date(latestVital.recorded_at), 'MMM d, yyyy')}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Alert banner */}
      {(criticals.length > 0 || warnings.length > 0) && (
        <div className="space-y-2">
          {criticals.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900 text-sm">
                    {criticals.length} Critical Value{criticals.length > 1 ? 's' : ''} — Immediate Attention Required
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {criticals.map((a, i) => (
                      <li key={i} className="text-sm text-red-800">• {a.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">
                    {warnings.length} Out-of-Range Metric{warnings.length > 1 ? 's' : ''}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {warnings.map((a, i) => (
                      <li key={i} className="text-sm text-amber-800">• {a.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {alerts.length === 0 && vitals.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">All monitored vitals are within normal range.</p>
        </div>
      )}

      {/* Vital cards grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Health Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {VITAL_PANELS.map(panel => (
            <VitalCard key={panel.key} panel={panel} vitals={vitals} hba1c={hba1c} />
          ))}
        </div>
      </div>

      {vitals.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No vitals recorded yet</p>
          <p className="text-sm mt-1">Vitals recorded during encounters will appear here.</p>
        </div>
      )}
    </div>
  );
}