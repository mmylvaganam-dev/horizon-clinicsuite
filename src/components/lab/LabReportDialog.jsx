import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import LabReportPrint from './LabReportPrint';
import { Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LabReportDialog({ open, onOpenChange, resultId, orderId }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadReport = async () => {
    if (reportData) return; // already loaded
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke('generateLabReport', { resultId, orderId });
    if (res.data?.success) {
      setReportData(res.data.reportData);
    } else {
      setError(res.data?.error || 'Failed to load report');
    }
    setLoading(false);
  };

  const handleOpen = (isOpen) => {
    onOpenChange(isOpen);
    if (isOpen) loadReport();
    if (!isOpen) { setReportData(null); setError(null); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            Lab Report
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Generating report...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-10">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={loadReport} className="mt-4">Retry</Button>
          </div>
        )}

        {reportData && !loading && (
          <LabReportPrint
            reportData={reportData}
            onClose={() => handleOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}