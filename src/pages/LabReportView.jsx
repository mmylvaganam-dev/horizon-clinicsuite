import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import LabReportPrint from '@/components/lab/LabReportPrint';
import { Loader2, Printer } from 'lucide-react';

/**
 * Public-facing page: /lab-report-view?resultId=xxx
 * No login required — accessed via QR code on printed report.
 */
export default function LabReportView() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const resultId = params.get('resultId');

  const appBaseUrl = window.location.origin;
  const reportUrl = `${appBaseUrl}/lab-report-view?resultId=${resultId}`;
  const profileUrl = `${appBaseUrl}/find-lab-report`;

  useEffect(() => {
    if (!resultId) {
      setError('No result ID provided.');
      setLoading(false);
      return;
    }
    base44.functions.invoke('generateLabReport', { resultId }).then(res => {
      if (res.data?.success) {
        setReportData(res.data.reportData);
      } else {
        setError(res.data?.error || 'Failed to load report');
      }
      setLoading(false);
    });
  }, [resultId]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'Arial' }}>
      <Loader2 style={{ width:32, height:32, animation:'spin 1s linear infinite', color:'#1a3c8f' }} />
      <span style={{ marginLeft:12, color:'#555' }}>Loading report...</span>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'Arial' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#c00', fontWeight:'bold', fontSize:'16px' }}>{error}</p>
        <p style={{ color:'#888', fontSize:'13px', marginTop:'8px' }}>
          Please scan the QR code again or visit <a href="/find-lab-report" style={{ color:'#1a3c8f' }}>Find My Report</a>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ background:'#e8eaf0', minHeight:'100vh', padding:'16px' }}>
      {/* Print button bar */}
      <div style={{
        maxWidth:'220mm', margin:'0 auto 12px', display:'flex', justifyContent:'flex-end', gap:'8px'
      }}>
        <button
          onClick={() => window.print()}
          style={{
            padding:'8px 20px', background:'#1a3c8f', color:'#fff',
            border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px',
            display:'flex', alignItems:'center', gap:'6px'
          }}
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      <div style={{ maxWidth:'220mm', margin:'0 auto', background:'#fff', boxShadow:'0 4px 24px rgba(0,0,0,0.12)' }}>
        <LabReportPrint
          reportData={reportData}
          reportUrl={reportUrl}
          profileUrl={profileUrl}
        />
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #lab-report-print-root { display: block !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}