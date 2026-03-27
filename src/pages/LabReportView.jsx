import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import LabReportPrint from '@/components/lab/LabReportPrint';
import { Loader2 } from 'lucide-react';

// Public-facing page: /lab-report-view?resultId=xxx
export default function LabReportView() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const resultId = params.get('resultId');

  useEffect(() => {
    if (!resultId) {
      setError('No result ID provided.');
      setLoading(false);
      return;
    }
    const load = async () => {
      const res = await base44.functions.invoke('generateLabReport', { resultId });
      if (res.data?.success) {
        setReportData(res.data.reportData);
      } else {
        setError(res.data?.error || 'Failed to load report');
      }
      setLoading(false);
    };
    load();
  }, [resultId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-3 text-slate-600">Loading report...</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <LabReportPrint reportData={reportData} onClose={() => window.history.back()} />
      </div>
    </div>
  );
}