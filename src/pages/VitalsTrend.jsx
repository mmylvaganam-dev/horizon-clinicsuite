import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, ArrowLeft, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
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
    { value: 'BP', label: 'Blood Pressure (mmHg)', color: '#3b82f6', isDual: true },
    { value: 'RR', label: 'Respiratory Rate (/min)', color: '#10b981' },
    { value: 'Temp', label: 'Temperature (°C)', color: '#f59e0b' },
    { value: 'Weight', label: 'Weight (kg)', color: '#ec4899' },
    { value: 'BMI', label: 'BMI', color: '#06b6d4' },
    { value: 'SpO2', label: 'SpO2 (%)', color: '#14b8a6' }
  ];

  const selectedOption = vitalOptions.find(v => v.value === selectedVital);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(13, 148, 136); // teal-600
    doc.rect(0, 0, pageW, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Vitals History Report', 14, 12);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 22);

    // Patient info
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(`Patient: ${patient?.first_name || ''} ${patient?.last_name || ''}`, 14, 42);
    if (patient?.date_of_birth) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`DOB: ${patient.date_of_birth}  |  PHN: ${patient.phn || 'N/A'}`, 14, 50);
    }

    // Table header
    const sortedVitals = [...vitals].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
    const cols = ['Date & Time', 'HR', 'BP', 'RR', 'Temp', 'Weight', 'Height', 'BMI', 'SpO2'];
    const colW = [45, 16, 22, 14, 16, 18, 18, 14, 16];
    let y = 62;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, pageW - 28, 8, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    let x = 14;
    cols.forEach((col, i) => { doc.text(col, x, y); x += colW[i]; });

    y += 5;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 30, 30);

    sortedVitals.forEach((v, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, pageW - 28, 7, 'F');
      }
      doc.setFontSize(8);
      x = 14;
      const row = [
        format(new Date(v.recorded_at), 'MMM d, yyyy h:mm a'),
        v.HR != null ? `${v.HR}` : '-',
        v.BP_sys != null ? `${v.BP_sys}/${v.BP_dia}` : '-',
        v.RR != null ? `${v.RR}` : '-',
        v.Temp != null ? `${v.Temp}°C` : '-',
        v.Weight != null ? `${v.Weight}kg` : '-',
        v.Height != null ? `${v.Height}cm` : '-',
        v.BMI != null ? `${v.BMI}` : '-',
        v.SpO2 != null ? `${v.SpO2}%` : '-',
      ];
      row.forEach((cell, i) => { doc.text(cell, x, y); x += colW[i]; });
      y += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This report is generated from electronic health records and is for clinical use only.', 14, 285);

    doc.save(`vitals-${patient?.first_name || 'patient'}-${patient?.last_name || ''}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const chartData = selectedVital === 'BP'
    ? vitals
        .filter(v => v.BP_sys != null && v.BP_dia != null)
        .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
        .map(v => ({
          date: format(new Date(v.recorded_at), 'MMM d'),
          systolic: v.BP_sys,
          diastolic: v.BP_dia
        }))
    : vitals
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
                  {selectedVital === 'BP' ? (
                    <>
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="systolic" 
                        name="Systolic"
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 5 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="diastolic" 
                        name="Diastolic"
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 5 }}
                      />
                    </>
                  ) : (
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={selectedOption?.color} 
                      strokeWidth={2}
                      dot={{ fill: selectedOption?.color, r: 5 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <h3 className="font-semibold mb-3">Data Table</h3>
                <div className="space-y-2">
                  {selectedVital === 'BP' ? (
                    vitals
                      .filter(v => v.BP_sys != null && v.BP_dia != null)
                      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
                      .map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-500">
                            {format(new Date(v.recorded_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span className="font-semibold text-slate-900">
                            <span className="text-red-600">{v.BP_sys}</span>/<span className="text-blue-600">{v.BP_dia}</span> mmHg
                          </span>
                        </div>
                      ))
                  ) : (
                    vitals
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
                      ))
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}