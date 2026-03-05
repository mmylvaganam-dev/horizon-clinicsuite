import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';

function calcDuration(appt) {
  if (!appt.consultation_started_at || !appt.consultation_ended_at) return '';
  return Math.round((new Date(appt.consultation_ended_at) - new Date(appt.consultation_started_at)) / 60000) + ' min';
}

export function exportCSV(appointments) {
  const headers = ['Date', 'Patient', 'Provider', 'Type', 'Status', 'Region', 'Duration', 'Billing USD', 'Billing Status'];
  const rows = appointments.map(a => [
    a.scheduled_time ? format(parseISO(a.scheduled_time), 'yyyy-MM-dd HH:mm') : '',
    a.patient_name || '',
    a.provider_name || '',
    a.appointment_type || '',
    a.status || '',
    a.patient_region || '',
    calcDuration(a),
    a.billing_amount_usd || 0,
    a.billing_status || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tele_report_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(appointments, kpiSummary) {
  const doc = new jsPDF();
  const today = format(new Date(), 'MMMM d, yyyy');

  // Header
  doc.setFontSize(18);
  doc.setTextColor(13, 148, 136);
  doc.text('CrossBorder Health Network', 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Telemedicine Consultation Report', 14, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${today}`, 14, 35);
  doc.line(14, 38, 196, 38);

  // KPIs
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text('Key Performance Indicators', 14, 46);
  doc.setFontSize(9);
  doc.setTextColor(80);
  const kpis = [
    `Total Consultations: ${kpiSummary.total}`,
    `Completed: ${kpiSummary.completed}  |  Completion Rate: ${kpiSummary.completionRate}%`,
    `Avg Duration: ${kpiSummary.avgDuration ?? '—'} min  |  No-Show Rate: ${kpiSummary.noShowRate}%`,
    `Total Revenue: $${kpiSummary.totalRevenue} USD`,
  ];
  kpis.forEach((line, i) => doc.text(line, 14, 54 + i * 7));

  doc.line(14, 84, 196, 84);

  // Table headers
  doc.setFontSize(9);
  doc.setTextColor(30);
  const cols = [14, 44, 84, 120, 148, 170];
  const headers = ['Date', 'Patient', 'Provider', 'Type', 'Status', 'USD'];
  headers.forEach((h, i) => doc.text(h, cols[i], 91));
  doc.line(14, 93, 196, 93);

  // Rows
  doc.setFontSize(8);
  doc.setTextColor(60);
  let y = 99;
  appointments.slice(0, 40).forEach(a => {
    if (y > 270) { doc.addPage(); y = 20; }
    const row = [
      a.scheduled_time ? format(parseISO(a.scheduled_time), 'MM/dd/yy') : '',
      (a.patient_name || '').substring(0, 18),
      (a.provider_name || '').substring(0, 16),
      (a.appointment_type || '').substring(0, 14),
      a.status || '',
      String(a.billing_amount_usd || 0),
    ];
    row.forEach((v, i) => doc.text(v, cols[i], y));
    y += 7;
  });

  if (appointments.length > 40) {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`... and ${appointments.length - 40} more rows. Export CSV for full data.`, 14, y + 4);
  }

  doc.save(`tele_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export default function ReportExport({ appointments }) {
  const completed = appointments.filter(a => a.status === 'COMPLETED');
  const noShow = appointments.filter(a => a.status === 'NO_SHOW');
  const total = appointments.length;
  const durations = completed.map(a => {
    if (!a.consultation_started_at || !a.consultation_ended_at) return null;
    return Math.round((new Date(a.consultation_ended_at) - new Date(a.consultation_started_at)) / 60000);
  }).filter(Boolean);

  const kpiSummary = {
    total,
    completed: completed.length,
    completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    avgDuration: durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null,
    noShowRate: total > 0 ? Math.round((noShow.length / total) * 100) : 0,
    totalRevenue: completed.reduce((s, a) => s + (a.billing_amount_usd || 0), 0),
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => exportCSV(appointments)} className="gap-1.5">
        <Download className="w-4 h-4" /> Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportPDF(appointments, kpiSummary)} className="gap-1.5">
        <FileText className="w-4 h-4" /> Export PDF
      </Button>
    </div>
  );
}