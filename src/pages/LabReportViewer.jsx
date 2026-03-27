import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import LabReportPrint from '@/components/lab/LabReportPrint';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

/**
 * Public/internal lab report viewer page.
 * URL: /lab-report?resultId=XXX
 * Also used from QR code: /lab-report?resultId=XXX&token=YYY
 */
export default function LabReportViewer() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const resultId = params.get('resultId');

  useEffect(() => {
    if (!resultId) {
      setError('No report ID provided.');
      setLoading(false);
      return;
    }
    base44.functions.invoke('generateLabReport', { resultId })
      .then(res => {
        if (res.data?.success) {
          setReportData(res.data.reportData);
        } else {
          setError(res.data?.error || 'Failed to load report.');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [resultId]);

  const handlePrint = () => window.print();

  const reportUrl = `${window.location.origin}/lab-report?resultId=${resultId}`;
  const profileUrl = `${window.location.origin}/patient-portal`;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Loading report...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="bg-white rounded-xl p-8 max-w-md text-center shadow">
        <p className="text-red-600 font-semibold text-lg mb-2">Report Error</p>
        <p className="text-slate-600">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 py-8">
      {/* Print controls - hidden in print */}
      <div className="max-w-[220mm] mx-auto mb-4 flex gap-3 print:hidden">
        <Button onClick={handlePrint} className="bg-cyan-600 hover:bg-cyan-700">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
        <p className="text-sm text-slate-500 self-center">
          Use your browser's print dialog to save as PDF or print on A4.
        </p>
      </div>

      {/* Report */}
      <div className="shadow-2xl">
        <LabReportPrint
          reportData={reportData}
          reportUrl={reportUrl}
          profileUrl={profileUrl}
        />
      </div>

      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}