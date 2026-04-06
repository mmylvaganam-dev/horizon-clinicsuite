import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, ArrowLeft, AlertTriangle, Sparkles, Heart,
  Droplets, Weight, TestTube, User, CalendarDays
} from 'lucide-react';
import { format, subMonths, subYears, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { checkVital, THRESHOLDS } from '@/lib/vitalsThresholds';
import ChronicConditionChart from '@/components/health/ChronicConditionChart';
import AITrendAlerts from '@/components/health/AITrendAlerts';

// ── Target ranges ────────────────────────────────────────────────
const TARGETS = {
  hba1c:             { min: 4.0, max: 7.0, label: 'Diabetic target', unit: '%' },
  bp_sys:            { min: 90,  max: 130, label: 'Systolic target', unit: 'mmHg' },
  bp_dia:            { min: 60,  max: 80,  label: 'Diastolic target', unit: 'mmHg' },
  ldl:               { min: 0,   max: 2.6, label: 'LDL target', unit: 'mmol/L' },
  hdl:               { min: 1.0, max: 4.0, label: 'HDL target', unit: 'mmol/L' },
  total_cholesterol: { min: 0,   max: 5.2, label: 'Total Chol target', unit: 'mmol/L' },
  triglycerides:     { min: 0,   max: 1.7, label: 'TG target', unit: 'mmol/L' },
  weight:            { min: null, max: null, unit: 'kg' },
  bmi:               { min: 18.5, max: 24.9, label: 'Normal BMI', unit: '' },
};

function getStatus(value, target) {
  if (value == null || !target) return null;
  if (target.max != null && value > target.max) return target.max && value > target.max * 1.15 ? 'critical' : 'warning';
  if (target.min != null && value < target.min) return 'warning';
  return 'normal';
}

// ── Time range filter helper ──────────────────────────────────────
function filterByRange(items, dateKey, rangeMonths) {
  if (!rangeMonths) return items;
  const cutoff = rangeMonths === 'ytd' ? new Date(new Date().getFullYear(), 0, 1) : subMonths(new Date(), rangeMonths);
  return items.filter(item => isAfter(new Date(item[dateKey]), cutoff));
}

// ── Extract lab values from Result.structured_json ────────────────
function extractLabSeries(results, testPattern) {
  return results
    .flatMap(r =>
      (r.structured_json?.parameters || r.structured_json?.test_results || [])
        .filter(p => testPattern.test(p.name || p.code || p.test_name || p.test_code || ''))
        .map(p => ({ date: format(new Date(r.result_date), 'MMM d, yy'), rawDate: r.result_date, value: parseFloat(p.value) }))
        .filter(p => !isNaN(p.value))
    )
    .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
}

export default function PatientHealthOverview() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patient');
  const [timeRange, setTimeRange] = useState(24); // months
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzedAt, setAnalyzedAt] = useState(null);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }).then(p => p[0]),
    enabled: !!patientId,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['patientVitals', patientId],
    queryFn: () => base44.entities.PatientVital.filter({ patient_ref: patientId }, '-recorded_at', 200),
    enabled: !!patientId,
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['patientLabResults', patientId],
    queryFn: () => base44.entities.Result.filter({ patient_id: patientId, result_type: 'LAB' }, '-result_date', 200),
    enabled: !!patientId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const resp = await base44.functions.invoke('analyzeHealthTrends', {
        patientId,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        vitalsData: { bp: bpSeries, weight: weightSeries },
        labData: { hba1c: hba1cSeries, lipids: lipidSeries },
      });
      return resp.data;
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
      setAnalyzedAt(data.analyzed_at);
    },
  });

  // ── Build chart series ─────────────────────────────────────────
  const filteredVitals = filterByRange(vitals, 'recorded_at', timeRange)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

  const filteredLabs = filterByRange(labResults, 'result_date', timeRange);

  const bpSeries = filteredVitals
    .filter(v => v.BP_sys != null)
    .map(v => ({ date: format(new Date(v.recorded_at), 'MMM d'), sys: v.BP_sys, dia: v.BP_dia }));

  const weightSeries = filteredVitals
    .filter(v => v.Weight != null)
    .map(v => ({ date: format(new Date(v.recorded_at), 'MMM d'), value: v.Weight, bmi: v.BMI }));

  const hba1cSeries = extractLabSeries(filteredLabs, /hba1c|hb a1c|a1c|glycat/i)
    .map(d => ({ ...d, key: d.value }));

  const ldlSeries   = extractLabSeries(filteredLabs, /\bldl\b/i);
  const hdlSeries   = extractLabSeries(filteredLabs, /\bhdl\b/i);
  const tcSeries    = extractLabSeries(filteredLabs, /total.?chol|cholesterol/i);
  const tgSeries    = extractLabSeries(filteredLabs, /triglyc/i);

  // Combined lipid chart — merge by date
  const allLipidDates = [...new Set([...ldlSeries, ...hdlSeries, ...tcSeries, ...tgSeries].map(d => d.date))].sort();
  const lipidSeries = allLipidDates.map(date => ({
    date,
    ldl: ldlSeries.find(d => d.date === date)?.value ?? null,
    hdl: hdlSeries.find(d => d.date === date)?.value ?? null,
    tc:  tcSeries.find(d => d.date === date)?.value ?? null,
    tg:  tgSeries.find(d => d.date === date)?.value ?? null,
  }));

  // ── Quick status check for alerts banner ──────────────────────
  const latestVital = filteredVitals[filteredVitals.length - 1];
  const latestHba1c = hba1cSeries[hba1cSeries.length - 1]?.value;
  const latestBP    = bpSeries[bpSeries.length - 1];
  const latestLDL   = ldlSeries[ldlSeries.length - 1]?.value;

  const quickAlerts = [];
  if (latestHba1c > 6.5) quickAlerts.push({ label: `HbA1c ${latestHba1c}%`, severity: 'critical' });
  else if (latestHba1c > 5.7) quickAlerts.push({ label: `HbA1c ${latestHba1c}%`, severity: 'warning' });
  if (latestBP?.sys > 140) quickAlerts.push({ label: `BP ${latestBP.sys}/${latestBP.dia} mmHg`, severity: 'critical' });
  else if (latestBP?.sys > 130) quickAlerts.push({ label: `BP ${latestBP.sys}/${latestBP.dia} mmHg`, severity: 'warning' });
  if (latestLDL > 4.1) quickAlerts.push({ label: `LDL ${latestLDL} mmol/L`, severity: 'warning' });

  if (!patientId) {
    return <div className="p-8 text-center text-slate-500">No patient selected. Open this page from a patient record.</div>;
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
            Longitudinal Health Dashboard
          </h1>
          {patient && (
            <p className="text-slate-500 text-sm mt-0.5">
              {patient.first_name} {patient.last_name}
              {patient.phn && <span className="ml-2 text-slate-400">· PHN: {patient.phn}</span>}
              {patient.date_of_birth && (
                <span className="ml-2 text-slate-400">
                  · DOB: {format(new Date(patient.date_of_birth), 'MMM d, yyyy')}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(timeRange)} onValueChange={v => setTimeRange(Number(v))}>
            <SelectTrigger className="w-36 h-9">
              <CalendarDays className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
              <SelectItem value="24">Last 2 years</SelectItem>
              <SelectItem value="60">Last 5 years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick alerts banner */}
      {quickAlerts.filter(a => a.severity === 'critical').length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 text-sm">Critical Values Detected</p>
            <p className="text-sm text-red-700 mt-0.5">{quickAlerts.filter(a=>a.severity==='critical').map(a=>a.label).join(' · ')}</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="chronic">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="chronic">Chronic Conditions</TabsTrigger>
            <TabsTrigger value="cardiovascular">Cardiovascular</TabsTrigger>
            <TabsTrigger value="metabolic">Metabolic</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-500" />
              AI Analysis
            </TabsTrigger>
          </TabsList>
          <Button
            size="sm"
            variant="outline"
            className="border-violet-300 text-violet-700 hover:bg-violet-50"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {analyzeMutation.isPending ? 'Analyzing...' : 'Run AI Analysis'}
          </Button>
        </div>

        {/* CHRONIC CONDITIONS TAB */}
        <TabsContent value="chronic" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* HbA1c */}
            <ChronicConditionChart
              title="HbA1c (Glycated Haemoglobin)"
              data={hba1cSeries.map(d => ({ date: d.date, value: d.value }))}
              lines={[{ key: 'value', label: 'HbA1c', color: '#f97316' }]}
              unit="%"
              targetMin={TARGETS.hba1c.min}
              targetMax={TARGETS.hba1c.max}
              targetLabel="Diabetic target"
              latestValue={latestHba1c}
              statusBadge={getStatus(latestHba1c, TARGETS.hba1c)}
              height={220}
            />

            {/* Blood Pressure */}
            <ChronicConditionChart
              title="Blood Pressure"
              data={bpSeries}
              lines={[
                { key: 'sys', label: 'Systolic', color: '#3b82f6' },
                { key: 'dia', label: 'Diastolic', color: '#06b6d4' },
              ]}
              unit=" mmHg"
              targetMin={TARGETS.bp_sys.min}
              targetMax={TARGETS.bp_sys.max}
              targetLabel="Systolic target"
              latestValue={latestBP ? `${latestBP.sys}/${latestBP.dia}` : null}
              statusBadge={getStatus(latestBP?.sys, TARGETS.bp_sys)}
              height={220}
            />
          </div>

          {/* Weight + BMI */}
          <ChronicConditionChart
            title="Weight & BMI Trend"
            data={weightSeries}
            lines={[
              { key: 'value', label: 'Weight (kg)', color: '#8b5cf6' },
              { key: 'bmi', label: 'BMI', color: '#ec4899', strokeDash: '5 3' },
            ]}
            unit=" kg"
            targetMin={null}
            targetMax={null}
            latestValue={latestVital?.Weight}
            statusBadge={getStatus(latestVital?.BMI, TARGETS.bmi)}
            height={200}
          />
        </TabsContent>

        {/* CARDIOVASCULAR TAB */}
        <TabsContent value="cardiovascular" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChronicConditionChart
              title="LDL Cholesterol"
              data={ldlSeries.map(d => ({ date: d.date, value: d.value }))}
              lines={[{ key: 'value', label: 'LDL', color: '#ef4444' }]}
              unit=" mmol/L"
              targetMin={TARGETS.ldl.min}
              targetMax={TARGETS.ldl.max}
              targetLabel="LDL target"
              latestValue={latestLDL}
              statusBadge={getStatus(latestLDL, TARGETS.ldl)}
              height={220}
            />
            <ChronicConditionChart
              title="HDL Cholesterol"
              data={hdlSeries.map(d => ({ date: d.date, value: d.value }))}
              lines={[{ key: 'value', label: 'HDL', color: '#10b981' }]}
              unit=" mmol/L"
              targetMin={TARGETS.hdl.min}
              targetMax={TARGETS.hdl.max}
              targetLabel="HDL target"
              latestValue={hdlSeries[hdlSeries.length - 1]?.value}
              statusBadge={getStatus(hdlSeries[hdlSeries.length - 1]?.value, TARGETS.hdl)}
              height={220}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChronicConditionChart
              title="Total Cholesterol"
              data={tcSeries.map(d => ({ date: d.date, value: d.value }))}
              lines={[{ key: 'value', label: 'Total Cholesterol', color: '#f59e0b' }]}
              unit=" mmol/L"
              targetMin={TARGETS.total_cholesterol.min}
              targetMax={TARGETS.total_cholesterol.max}
              targetLabel="Total Chol target"
              latestValue={tcSeries[tcSeries.length - 1]?.value}
              statusBadge={getStatus(tcSeries[tcSeries.length - 1]?.value, TARGETS.total_cholesterol)}
              height={220}
            />
            <ChronicConditionChart
              title="Triglycerides"
              data={tgSeries.map(d => ({ date: d.date, value: d.value }))}
              lines={[{ key: 'value', label: 'Triglycerides', color: '#06b6d4' }]}
              unit=" mmol/L"
              targetMin={TARGETS.triglycerides.min}
              targetMax={TARGETS.triglycerides.max}
              targetLabel="TG target"
              latestValue={tgSeries[tgSeries.length - 1]?.value}
              statusBadge={getStatus(tgSeries[tgSeries.length - 1]?.value, TARGETS.triglycerides)}
              height={220}
            />
          </div>

          {/* Full lipid panel combined */}
          {lipidSeries.length > 0 && (
            <ChronicConditionChart
              title="Full Lipid Panel — Combined View"
              data={lipidSeries}
              lines={[
                { key: 'tc',  label: 'Total Chol', color: '#f59e0b' },
                { key: 'ldl', label: 'LDL', color: '#ef4444' },
                { key: 'hdl', label: 'HDL', color: '#10b981' },
                { key: 'tg',  label: 'Triglycerides', color: '#06b6d4', strokeDash: '4 2' },
              ]}
              unit=" mmol/L"
              targetMax={5.2}
              targetLabel="Total chol upper"
              height={260}
            />
          )}
        </TabsContent>

        {/* METABOLIC TAB */}
        <TabsContent value="metabolic" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChronicConditionChart
              title="HbA1c (Diabetes Control)"
              data={hba1cSeries.map(d => ({ date: d.date, value: d.value }))}
              lines={[{ key: 'value', label: 'HbA1c', color: '#f97316' }]}
              unit="%"
              targetMin={4.0}
              targetMax={7.0}
              targetLabel="Diabetic target (<7%)"
              latestValue={latestHba1c}
              statusBadge={getStatus(latestHba1c, TARGETS.hba1c)}
              height={220}
            />
            <ChronicConditionChart
              title="BMI Trend"
              data={weightSeries.filter(d => d.bmi != null).map(d => ({ date: d.date, value: d.bmi }))}
              lines={[{ key: 'value', label: 'BMI', color: '#8b5cf6' }]}
              unit=""
              targetMin={18.5}
              targetMax={24.9}
              targetLabel="Normal BMI range"
              latestValue={latestVital?.BMI}
              statusBadge={getStatus(latestVital?.BMI, TARGETS.bmi)}
              height={220}
            />
          </div>
          <ChronicConditionChart
            title="Weight Over Time"
            data={weightSeries}
            lines={[{ key: 'value', label: 'Weight (kg)', color: '#8b5cf6' }]}
            unit=" kg"
            latestValue={latestVital?.Weight}
            height={200}
          />
        </TabsContent>

        {/* AI ANALYSIS TAB */}
        <TabsContent value="ai" className="mt-4">
          <AITrendAlerts
            analysis={aiAnalysis}
            isLoading={analyzeMutation.isPending}
            onRefresh={() => analyzeMutation.mutate()}
            analyzedAt={analyzedAt}
          />
        </TabsContent>
      </Tabs>

      {/* Data summary footer */}
      <div className="flex items-center gap-6 text-xs text-slate-400 border-t pt-4">
        <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />{vitals.length} vital records</span>
        <span className="flex items-center gap-1.5"><TestTube className="w-3.5 h-3.5" />{labResults.length} lab results</span>
        <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Showing last {timeRange} months</span>
      </div>
    </div>
  );
}