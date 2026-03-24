import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { checkVital, getVitalsAlerts } from '@/lib/vitalsThresholds';

export default function VitalsHeader({ patientId }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    HR: '', HR_rhythm: 'regular', BP_sys: '', BP_dia: '', BP_arm: 'left', BP_sys_right: '', BP_dia_right: '',
    RR: '', Temp: '', Weight: '', Height: '', SpO2: '',
    recorded_at_input: new Date().toISOString().slice(0, 16)
  });

  // Auto-calculate MAP from BP_sys and BP_dia
  const calcMAP = (sys, dia) => {
    const s = parseFloat(sys), d = parseFloat(dia);
    if (!s || !d) return null;
    return Math.round(d + (s - d) / 3);
  };

  const { data: vitals = [] } = useQuery({
    queryKey: ['patientVitals', patientId],
    queryFn: () => base44.entities.PatientVital.filter({ patient_ref: patientId }, '-recorded_at', 50),
    enabled: !!patientId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const addVitalsMutation = useMutation({
    mutationFn: async (data) => {
      const BMI = data.Weight && data.Height 
        ? parseFloat((data.Weight / Math.pow(data.Height / 100, 2)).toFixed(1))
        : null;
      
      const { recorded_at_input, ...vitalsData } = data;

      // Auto-calculate MAP if BP present
      const map = calcMAP(data.BP_sys, data.BP_dia);

      // Strip out empty-string fields so numeric fields don't fail validation
      const cleanVitals = Object.fromEntries(
        Object.entries(vitalsData).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );

      return base44.entities.PatientVital.create({
        patient_ref: patientId,
        organization_id: user?.organization_id || '',
        recorded_at: recorded_at_input ? new Date(recorded_at_input).toISOString() : new Date().toISOString(),
        source: 'manual',
        recorded_by: user?.id || user?.email || 'manual',
        recorded_by_email: user?.email,
        ...(BMI !== null ? { BMI } : {}),
        ...(map !== null ? { MAP: map } : {}),
        ...cleanVitals
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientVitals', patientId] });
      setShowAddVitals(false);
      setVitalsForm({ HR: '', HR_rhythm: 'regular', BP_sys: '', BP_dia: '', BP_arm: 'left', BP_sys_right: '', BP_dia_right: '', RR: '', Temp: '', Weight: '', Height: '', SpO2: '', recorded_at_input: new Date().toISOString().slice(0, 16) });
    }
  });

  const latestVitals = vitals[0] || {};
  const latestAlerts = getVitalsAlerts(latestVitals);
  const hasCritical = latestAlerts.some(a => a.severity === 'critical');

  const vitalColor = (key) => {
    const r = checkVital(key, latestVitals[key]);
    if (!r.abnormal) return '';
    return r.severity === 'critical' ? 'text-red-600' : 'text-amber-600';
  };
  const bpColor = () => {
    const rSys = checkVital('BP_sys', latestVitals.BP_sys);
    const rDia = checkVital('BP_dia', latestVitals.BP_dia);
    if (!rSys.abnormal && !rDia.abnormal) return '';
    const sev = [rSys, rDia].some(r => r.severity === 'critical') ? 'critical' : 'warning';
    return sev === 'critical' ? 'text-red-600' : 'text-amber-600';
  };

  return (
    <>
      <Card className={`border-2 ${hasCritical ? 'border-red-400 bg-red-50' : latestAlerts.length > 0 ? 'border-amber-300 bg-amber-50' : 'bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className={`w-5 h-5 ${hasCritical ? 'text-red-600' : latestAlerts.length > 0 ? 'text-amber-600' : 'text-teal-600'}`} />
              <h3 className="font-semibold text-slate-900">Latest Vitals</h3>
              {latestAlerts.length > 0 && (
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${hasCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {hasCritical ? 'Critical Values' : 'Abnormal Values'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddVitals(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('VitalsTrend') + `?patient=${patientId}`)}>
                <TrendingUp className="w-4 h-4 mr-1" />
                History ({vitals.length})
              </Button>
            </div>
          </div>

          {latestAlerts.length > 0 && (
            <div className={`mb-3 p-2 rounded-lg text-xs space-y-0.5 ${hasCritical ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
              {latestAlerts.map((a, i) => (
                <div key={i} className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{a.message}</span>
                  {a.severity === 'critical' && <span className="font-bold ml-1">⚠ CRITICAL</span>}
                </div>
              ))}
            </div>
          )}

          {latestVitals.recorded_at && (
            <p className="text-xs text-slate-400 mb-2">
              Recorded: {new Date(latestVitals.recorded_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <div className="grid grid-cols-4 md:grid-cols-9 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs">HR</p>
              <p className={`font-semibold ${vitalColor('HR')}`}>{latestVitals.HR || '-'} <span className="text-xs text-slate-500">bpm</span></p>
              {latestVitals.HR_rhythm && (
                <p className={`text-xs font-medium mt-0.5 ${latestVitals.HR_rhythm === 'irregular' ? 'text-amber-600' : 'text-slate-400'}`}>
                  {latestVitals.HR_rhythm === 'irregular' ? '⚠ Irregular' : 'Regular'}
                </p>
              )}
            </div>
            <div>
              <p className="text-slate-500 text-xs">
                BP {latestVitals.BP_arm === 'left' ? '(L)' : latestVitals.BP_arm === 'right' ? '(R)' : latestVitals.BP_arm === 'both' ? '(L/R)' : ''}
              </p>
              <p className={`font-semibold ${bpColor()}`}>
                {latestVitals.BP_sys && latestVitals.BP_dia ? `${latestVitals.BP_sys}/${latestVitals.BP_dia}` : '-'}
              </p>
              {latestVitals.BP_arm === 'both' && latestVitals.BP_sys_right && (
                <p className="text-xs text-slate-500">{`R: ${latestVitals.BP_sys_right}/${latestVitals.BP_dia_right}`}</p>
              )}
            </div>
            <div>
              <p className="text-slate-500 text-xs">MAP</p>
              <p className={`font-semibold ${latestVitals.MAP && (latestVitals.MAP < 70 || latestVitals.MAP > 100) ? (latestVitals.MAP < 60 || latestVitals.MAP > 110 ? 'text-red-600' : 'text-amber-600') : ''}`}>
                {latestVitals.MAP || '-'} <span className="text-xs text-slate-500">{latestVitals.MAP ? 'mmHg' : ''}</span>
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">RR</p>
              <p className={`font-semibold ${vitalColor('RR')}`}>{latestVitals.RR || '-'} <span className="text-xs text-slate-500">/min</span></p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Temp</p>
              <p className={`font-semibold ${vitalColor('Temp')}`}>{latestVitals.Temp || '-'} <span className="text-xs text-slate-500">°C</span></p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Weight</p>
              <p className="font-semibold">{latestVitals.Weight || '-'} <span className="text-xs text-slate-500">kg</span></p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Height</p>
              <p className="font-semibold">{latestVitals.Height || '-'} <span className="text-xs text-slate-500">cm</span></p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">BMI</p>
              <p className={`font-semibold ${vitalColor('BMI')}`}>{latestVitals.BMI || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">SpO2</p>
              <p className={`font-semibold ${vitalColor('SpO2')}`}>{latestVitals.SpO2 || '-'} <span className="text-xs text-slate-500">%</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddVitals} onOpenChange={setShowAddVitals}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vitals</DialogTitle>
          </DialogHeader>
          <div className="mt-4 mb-2">
            <Label>Date & Time of Recording</Label>
            <Input
              type="datetime-local"
              value={vitalsForm.recorded_at_input}
              onChange={(e) => setVitalsForm({...vitalsForm, recorded_at_input: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <Label>HR (bpm)</Label>
              <Input type="number" value={vitalsForm.HR} onChange={(e) => setVitalsForm({...vitalsForm, HR: parseFloat(e.target.value) || ''})} />
            </div>
            <div>
              <Label>HR Rhythm</Label>
              <div className="flex gap-2 mt-1">
                {['regular', 'irregular'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setVitalsForm({...vitalsForm, HR_rhythm: r})}
                    className={`flex-1 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      vitalsForm.HR_rhythm === r
                        ? r === 'irregular' ? 'bg-amber-500 text-white border-amber-500' : 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>SpO2 (%)</Label>
              <Input type="number" value={vitalsForm.SpO2} onChange={(e) => setVitalsForm({...vitalsForm, SpO2: parseFloat(e.target.value) || ''})} />
            </div>
            <div className="col-span-2">
              <Label>BP Arm</Label>
              <div className="flex gap-2 mt-1">
                {['left', 'right', 'both'].map(arm => (
                  <button
                    key={arm}
                    type="button"
                    onClick={() => setVitalsForm({...vitalsForm, BP_arm: arm})}
                    className={`flex-1 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      vitalsForm.BP_arm === arm
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {arm === 'both' ? 'Both Arms' : `${arm.charAt(0).toUpperCase() + arm.slice(1)} Arm`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{vitalsForm.BP_arm === 'both' ? 'BP Systolic (Left)' : 'BP Systolic'}</Label>
              <Input type="number" value={vitalsForm.BP_sys} onChange={(e) => setVitalsForm({...vitalsForm, BP_sys: parseFloat(e.target.value) || ''})} />
            </div>
            <div>
              <Label>{vitalsForm.BP_arm === 'both' ? 'BP Diastolic (Left)' : 'BP Diastolic'}</Label>
              <Input type="number" value={vitalsForm.BP_dia} onChange={(e) => setVitalsForm({...vitalsForm, BP_dia: parseFloat(e.target.value) || ''})} />
            </div>
            {vitalsForm.BP_arm === 'both' && (
              <>
                <div>
                  <Label>BP Systolic (Right)</Label>
                  <Input type="number" value={vitalsForm.BP_sys_right} onChange={(e) => setVitalsForm({...vitalsForm, BP_sys_right: parseFloat(e.target.value) || ''})} />
                </div>
                <div>
                  <Label>BP Diastolic (Right)</Label>
                  <Input type="number" value={vitalsForm.BP_dia_right} onChange={(e) => setVitalsForm({...vitalsForm, BP_dia_right: parseFloat(e.target.value) || ''})} />
                </div>
              </>
            )}
            <div>
              <Label>RR (/min)</Label>
              <Input type="number" value={vitalsForm.RR} onChange={(e) => setVitalsForm({...vitalsForm, RR: parseFloat(e.target.value) || ''})} />
            </div>
            <div>
              <Label>Temp (°C)</Label>
              <Input type="number" step="0.1" value={vitalsForm.Temp} onChange={(e) => setVitalsForm({...vitalsForm, Temp: parseFloat(e.target.value) || ''})} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={vitalsForm.Weight} onChange={(e) => setVitalsForm({...vitalsForm, Weight: parseFloat(e.target.value) || ''})} />
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" value={vitalsForm.Height} onChange={(e) => setVitalsForm({...vitalsForm, Height: parseFloat(e.target.value) || ''})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowAddVitals(false)}>Cancel</Button>
            <Button onClick={() => addVitalsMutation.mutate(vitalsForm)} disabled={addVitalsMutation.isPending}>
              Save Vitals
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}