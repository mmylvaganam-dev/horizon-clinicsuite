import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Table, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

const EXPORT_OPTIONS = [
  { label: 'Patients', entity: 'Patient', fields: ['first_name', 'last_name', 'phn', 'date_of_birth', 'gender', 'phone', 'email', 'status'] },
  { label: 'Appointments', entity: 'Appointment', fields: ['patient_id', 'provider_id', 'start_time', 'end_time', 'status', 'type', 'reason'] },
  { label: 'Pharmacy Sales', entity: 'PharmacySaleHeader', fields: ['sale_number', 'patient_name', 'total_amount', 'payment_method', 'status', 'created_date'] },
  { label: 'Prescriptions', entity: 'Prescription', fields: ['patient_id', 'drug_name', 'strength', 'dosage_form', 'quantity', 'status', 'prescribed_date'] },
  { label: 'Staff Users', entity: 'User', fields: ['full_name', 'email', 'role', 'organization_id', 'created_date'] },
  { label: 'Invoices', entity: 'Invoice', fields: ['invoice_number', 'patient_id', 'total_amount', 'status', 'created_date'] },
];

function flattenRecord(record, fields) {
  const row = {};
  fields.forEach(f => {
    let val = record[f] ?? record.data?.[f] ?? '';
    if (val instanceof Date || (typeof val === 'string' && val.includes('T') && val.includes('Z'))) {
      try { val = new Date(val).toLocaleDateString(); } catch (_) {}
    }
    if (Array.isArray(val)) val = val.join(', ');
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    row[f] = val;
  });
  return row;
}

function downloadCSV(rows, fields, filename) {
  const header = fields.join(',');
  const body = rows.map(r => fields.map(f => {
    const cell = String(r[f] ?? '').replace(/"/g, '""');
    return `"${cell}"`;
  }).join(','));
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(rows, fields, title) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(8);

  const colWidth = Math.min(30, (doc.internal.pageSize.getWidth() - 20) / fields.length);
  let y = 28;

  // Header row
  doc.setFillColor(13, 148, 136);
  doc.rect(10, y - 5, doc.internal.pageSize.getWidth() - 20, 8, 'F');
  doc.setTextColor(255, 255, 255);
  fields.forEach((f, i) => doc.text(f, 10 + i * colWidth, y));

  doc.setTextColor(0, 0, 0);
  y += 8;

  rows.forEach((row, rowIdx) => {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
    if (rowIdx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(10, y - 5, doc.internal.pageSize.getWidth() - 20, 7, 'F');
    }
    fields.forEach((f, i) => {
      const text = String(row[f] ?? '').substring(0, 18);
      doc.text(text, 10 + i * colWidth, y);
    });
    y += 7;
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function DataExportPanel({ organizationId }) {
  const [loading, setLoading] = useState({});

  const handleExport = async (option, format) => {
    const key = `${option.entity}-${format}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      let records = [];
      try {
        if (organizationId) {
          records = await base44.entities[option.entity].filter({ organization_id: organizationId });
        } else {
          records = await base44.entities[option.entity].list();
        }
      } catch (_) {
        records = await base44.entities[option.entity].list();
      }

      if (!records || records.length === 0) {
        toast('No data found to export.', { icon: 'ℹ️' });
        return;
      }

      const rows = records.map(r => flattenRecord(r, option.fields));
      const filename = `${option.label}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'csv') {
        downloadCSV(rows, option.fields, `${filename}.csv`);
        toast.success(`✅ ${option.label} exported as CSV (${records.length} rows)`);
      } else {
        downloadPDF(rows, option.fields, option.label);
        toast.success(`✅ ${option.label} exported as PDF (${records.length} rows)`);
      }
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Download reports directly from the application. Select a data type and choose your preferred format.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_OPTIONS.map(option => (
          <div key={option.entity} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">{option.label}</p>
              <p className="text-xs text-slate-500">{option.fields.length} columns</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-green-600 text-green-700 hover:bg-green-50"
                disabled={!!loading[`${option.entity}-csv`]}
                onClick={() => handleExport(option, 'csv')}
              >
                {loading[`${option.entity}-csv`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Table className="w-3 h-3" />}
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-red-600 text-red-700 hover:bg-red-50"
                disabled={!!loading[`${option.entity}-pdf`]}
                onClick={() => handleExport(option, 'pdf')}
              >
                {loading[`${option.entity}-pdf`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}