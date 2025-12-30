import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function VitalsTrend() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patient');
  
  const [selectedVital, setSelectedVital] = useState('HR');

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }).then(p => p[0]),
    enabled: !!patientId
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['patientVitals', patientId],
    queryFn: () => base44.entities.PatientVital.filter({ patient_ref: patientId }),
    enabled: !!patientId
  });

  const vitalOptions = [
    { value: 'HR', label: 'Heart Rate (bpm)', color: '#ef4444' },
    { value: 'BP_sys', label: 'Systolic BP (mmHg)', color: '#3b82f6' },
    { value: 'BP_dia', label: 'Diastolic BP (mmHg)', color: '#8b5cf6' },
    { value: 'RR', label: 'Respiratory Rate (/min)', color: '#10b981' },
    { value: 'Temp', label: 'Temperature (°C)', color: '#f59e0b' },
    { value: 'Weight', label: 'Weight (kg)', color: '#ec4899' },
    { value: 'BMI', label: 'BMI', color: '#06b6d4' },
    { value: 'SpO2', label: 'SpO2 (%)', color: '#14b8a6' }
  ];

  const selectedOption = vitalOptions.find(v => v.value === selectedVital);

  const chartData = vitals
    .filter(v => v[selectedVital] != null)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .map(v => ({
      date: format(new Date(v.recorded_at), 'MMM d'),
      value: v[selectedVital]
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vitals Trend</h1>
          {patient && <p className="text-slate-500 mt-1">{patient.first_name} {patient.last_name}</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              Vital Sign Trends
            </CardTitle>
            <Select value={selectedVital} onValueChange={setSelectedVital}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vitalOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No data available for {selectedOption?.label}</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={selectedOption?.color} 
                    strokeWidth={2}
                    dot={{ fill: selectedOption?.color, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <h3 className="font-semibold mb-3">Data Table</h3>
                <div className="space-y-2">
                  {vitals
                    .filter(v => v[selectedVital] != null)
                    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
                    .map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-500">
                          {format(new Date(v.recorded_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {v[selectedVital]} {selectedOption?.label.match(/\(([^)]+)\)/)?.[1] || ''}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}