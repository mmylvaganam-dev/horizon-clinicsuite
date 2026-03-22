import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export default function ClinicalSummaryReport({ patient, open, onOpenChange }) {
  const [generating, setGenerating] = useState(false);

  const patientId = patient?.id;

  const { data: vitals = [] } = useQuery({
    queryKey: ['patientVitals', patientId],
    queryFn: () => base44.entities.PatientVital.filter({ patient_ref: patientId }),
    enabled: !!patientId && open,
  });

  const { data: cppItems = [] } = useQuery({
    queryKey: ['cppItems', patientId],
    queryFn: () => base44.entities.CPPItem.filter({ patient_ref: patientId }),
    enabled: !!patientId && open,
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patientPrescriptions', patientId],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patientId }, '-prescribed_date'),
    enabled: !!patientId && open,
  });

  const { data: soapNotes = [] } = useQuery({
    queryKey: ['patientSOAP', patientId],
    queryFn: () => base44.entities.SOAPNote.filter({ patient_id: patientId }, '-note_date'),
    enabled: !!patientId && open,
  });

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding'],
    queryFn: async () => {
      const brandings = await base44.entities.OrganizationBranding.list();
      return brandings[0];
    },
    enabled: open,
  });

  const latestVitals = vitals.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0] || {};
  const activeProblems = cppItems.filter(i => i.status === 'active');
  const activeMeds = prescriptions.filter(p => ['New', 'Verified', 'Dispensed'].includes(p.status));
  const recentSOAP = soapNotes.slice(0, 3);

  const age = patient?.date_of_birth
    ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const generatePDF = () => {
    setGenerating(true);
    const doc = new jsPDF({ format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    const checkPage = (needed = 20) => {
      if (y + needed > 270) { doc.addPage(); y = 20; }
    };

    // Header bar
    doc.setFillColor(13, 148, 136); // teal-600
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(branding?.clinic_name || 'Clinical Summary', pageW / 2, 9, { align: 'center' });

    y = 22;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CLINICAL SUMMARY REPORT', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageW / 2, y, { align: 'center' });

    y += 10;
    // Patient banner
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y, pageW - 28, 22, 3, 3, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${patient.first_name} ${patient.last_name}`, 20, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const patientMeta = [
      patient.phn ? `PHN: ${patient.phn}` : null,
      age ? `Age: ${age} yrs` : null,
      patient.gender ? patient.gender : null,
      patient.blood_type && patient.blood_type !== 'unknown' ? `Blood: ${patient.blood_type}` : null,
      patient.date_of_birth ? `DOB: ${format(new Date(patient.date_of_birth), 'dd/MM/yyyy')}` : null,
    ].filter(Boolean).join('   |   ');
    doc.text(patientMeta, 20, y + 16);
    if (patient.allergies) {
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`⚠  Allergies: ${patient.allergies}`, 20, y + 21);
    }
    y += 28;

    const sectionTitle = (title) => {
      checkPage(14);
      doc.setFillColor(13, 148, 136);
      doc.rect(14, y, 4, 10, 'F');
      doc.setTextColor(13, 148, 136);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(title, 22, y + 7);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 11, pageW - 14, y + 11);
      y += 15;
    };

    // ---- VITALS ----
    sectionTitle('Latest Vitals');
    if (!latestVitals.HR && !latestVitals.BP_sys) {
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No vitals recorded', 20, y);
      y += 8;
    } else {
      const vitalsGrid = [
        ['Heart Rate', latestVitals.HR ? `${latestVitals.HR} bpm` : '-'],
        ['Blood Pressure', latestVitals.BP_sys ? `${latestVitals.BP_sys}/${latestVitals.BP_dia} mmHg` : '-'],
        ['Resp. Rate', latestVitals.RR ? `${latestVitals.RR} /min` : '-'],
        ['Temperature', latestVitals.Temp ? `${latestVitals.Temp} °C` : '-'],
        ['Weight', latestVitals.Weight ? `${latestVitals.Weight} kg` : '-'],
        ['Height', latestVitals.Height ? `${latestVitals.Height} cm` : '-'],
        ['BMI', latestVitals.BMI ? `${latestVitals.BMI}` : '-'],
        ['SpO2', latestVitals.SpO2 ? `${latestVitals.SpO2}%` : '-'],
      ];
      const cols = 4;
      const cellW = (pageW - 28) / cols;
      vitalsGrid.forEach((v, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = 14 + col * cellW;
        const cy = y + row * 14;
        doc.setFillColor(col % 2 === 0 ? 248 : 241, 250, 252);
        doc.roundedRect(cx, cy, cellW - 2, 12, 2, 2, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(v[0], cx + 4, cy + 5);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(v[1], cx + 4, cy + 10);
      });
      const rows = Math.ceil(vitalsGrid.length / cols);
      y += rows * 14 + 6;
      if (latestVitals.recorded_at) {
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text(`Recorded: ${format(new Date(latestVitals.recorded_at), 'dd MMM yyyy HH:mm')}`, 14, y);
        y += 8;
      }
    }

    // ---- ACTIVE DIAGNOSES ----
    checkPage(20);
    sectionTitle(`Active Problems / Diagnoses (${activeProblems.length})`);
    if (activeProblems.length === 0) {
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No active problems', 20, y);
      y += 8;
    } else {
      activeProblems.forEach((p, i) => {
        checkPage(14);
        doc.setFillColor(i % 2 === 0 ? 255 : 248, 250, 252);
        doc.rect(14, y, pageW - 28, 12, 'F');
        doc.setFillColor(239, 68, 68);
        doc.circle(20, y + 6, 2, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(p.problem_name, 26, y + 5);
        if (p.notes) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(8);
          doc.text(p.notes.substring(0, 80), 26, y + 10);
        }
        if (p.onset_date) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(7);
          doc.text(`Onset: ${format(new Date(p.onset_date), 'MMM yyyy')}`, pageW - 40, y + 5);
        }
        y += 14;
      });
    }
    y += 4;

    // ---- MEDICATIONS ----
    checkPage(20);
    sectionTitle(`Current Medications (${activeMeds.length})`);
    if (activeMeds.length === 0) {
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No current medications', 20, y);
      y += 8;
    } else {
      activeMeds.forEach((rx, i) => {
        checkPage(14);
        doc.setFillColor(i % 2 === 0 ? 255 : 248, 250, 252);
        doc.rect(14, y, pageW - 28, 12, 'F');
        doc.setFillColor(37, 99, 235);
        doc.circle(20, y + 6, 2, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(rx.drug_name, 26, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        const details = [rx.strength, rx.directions].filter(Boolean).join(' — ');
        if (details) doc.text(details.substring(0, 90), 26, y + 10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(rx.status, pageW - 30, y + 5);
        y += 14;
      });
    }
    y += 4;

    // ---- RECENT SOAP NOTES ----
    if (recentSOAP.length > 0) {
      checkPage(20);
      sectionTitle('Recent Clinical Notes');
      recentSOAP.forEach((note) => {
        checkPage(30);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, y, pageW - 28, 8, 2, 2, 'F');
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(
          `${format(new Date(note.note_date), 'dd MMM yyyy')}${note.provider ? `  —  ${note.provider}` : ''}`,
          20, y + 5.5
        );
        y += 10;
        if (note.subjective) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(13, 148, 136);
          doc.text('S:', 18, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          const lines = doc.splitTextToSize(note.subjective, pageW - 45);
          doc.text(lines.slice(0, 3), 24, y);
          y += lines.slice(0, 3).length * 4 + 2;
        }
        if (note.assessment) {
          checkPage(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(13, 148, 136);
          doc.text('A:', 18, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          const lines = doc.splitTextToSize(note.assessment, pageW - 45);
          doc.text(lines.slice(0, 3), 24, y);
          y += lines.slice(0, 3).length * 4 + 2;
        }
        y += 4;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 284, pageW, 13, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('CONFIDENTIAL — FOR AUTHORISED CLINICAL USE ONLY', pageW / 2, 290, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, pageW - 14, 290, { align: 'right' });
    }

    doc.save(`Clinical_Summary_${patient.last_name}_${patient.first_name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    setGenerating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Clinical Summary — {patient?.first_name} {patient?.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="space-y-5 text-sm mt-2" id="clinical-summary-preview">
          {/* Patient Info */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 border border-teal-100">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{patient?.first_name} {patient?.last_name}</h2>
                <div className="flex flex-wrap gap-2 mt-1 text-slate-600 text-xs">
                  {patient?.phn && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">PHN: {patient.phn}</span>}
                  {age && <span>{age} yrs old</span>}
                  {patient?.gender && <span className="capitalize">{patient.gender}</span>}
                  {patient?.blood_type && patient.blood_type !== 'unknown' && <span>Blood: {patient.blood_type}</span>}
                  {patient?.date_of_birth && <span>DOB: {format(new Date(patient.date_of_birth), 'dd/MM/yyyy')}</span>}
                </div>
              </div>
              <span className="text-xs text-slate-400">Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
            </div>
            {patient?.allergies && (
              <div className="mt-2 bg-amber-100 text-amber-800 rounded-lg px-3 py-1.5 text-xs font-medium">
                ⚠️ Allergies: {patient.allergies}
              </div>
            )}
          </div>

          {/* Vitals */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-teal-500 rounded block" />
              Latest Vitals
            </h3>
            {latestVitals.HR || latestVitals.BP_sys ? (
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['HR', latestVitals.HR ? `${latestVitals.HR} bpm` : '-'],
                  ['BP', latestVitals.BP_sys ? `${latestVitals.BP_sys}/${latestVitals.BP_dia}` : '-'],
                  ['RR', latestVitals.RR ? `${latestVitals.RR}/min` : '-'],
                  ['Temp', latestVitals.Temp ? `${latestVitals.Temp}°C` : '-'],
                  ['Weight', latestVitals.Weight ? `${latestVitals.Weight}kg` : '-'],
                  ['Height', latestVitals.Height ? `${latestVitals.Height}cm` : '-'],
                  ['BMI', latestVitals.BMI || '-'],
                  ['SpO2', latestVitals.SpO2 ? `${latestVitals.SpO2}%` : '-'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2 border text-center">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="font-semibold text-slate-900 text-sm">{val}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs">No vitals recorded</p>
            )}
          </div>

          {/* Active Problems */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-rose-500 rounded block" />
              Active Problems / Diagnoses ({activeProblems.length})
            </h3>
            {activeProblems.length === 0 ? (
              <p className="text-slate-400 italic text-xs">No active problems</p>
            ) : (
              <div className="space-y-1">
                {activeProblems.map(p => (
                  <div key={p.id} className="flex items-start gap-2 p-2 bg-rose-50 rounded-lg border border-rose-100">
                    <span className="w-2 h-2 rounded-full bg-rose-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">{p.problem_name}</p>
                      {p.notes && <p className="text-xs text-slate-500">{p.notes}</p>}
                    </div>
                    {p.onset_date && <span className="ml-auto text-xs text-slate-400">{format(new Date(p.onset_date), 'MMM yyyy')}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medications */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded block" />
              Current Medications ({activeMeds.length})
            </h3>
            {activeMeds.length === 0 ? (
              <p className="text-slate-400 italic text-xs">No current medications</p>
            ) : (
              <div className="space-y-1">
                {activeMeds.map(rx => (
                  <div key={rx.id} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="w-2 h-2 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{rx.drug_name}</p>
                      <p className="text-xs text-slate-500">{[rx.strength, rx.directions].filter(Boolean).join(' — ')}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{rx.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent SOAP */}
          {recentSOAP.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded block" />
                Recent Clinical Notes
              </h3>
              <div className="space-y-2">
                {recentSOAP.map(note => (
                  <div key={note.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs space-y-1">
                    <p className="font-semibold text-slate-700">{format(new Date(note.note_date), 'dd MMM yyyy')}{note.provider ? ` — ${note.provider}` : ''}</p>
                    {note.subjective && <p><span className="font-medium text-teal-600">S:</span> {note.subjective.substring(0, 150)}</p>}
                    {note.assessment && <p><span className="font-medium text-teal-600">A:</span> {note.assessment.substring(0, 150)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={generatePDF} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {generating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}