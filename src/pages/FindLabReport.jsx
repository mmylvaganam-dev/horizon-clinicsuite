import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, FileText, ExternalLink } from 'lucide-react';

/**
 * Public "Find My Lab Report" page — /find-lab-report
 * Patient enters Mobile No + Bill No to retrieve their reports.
 * Mirrors Wayamba's reports.wayambalabs.com/findreport flow.
 */
export default function FindLabReport() {
  const [mobile, setMobile] = useState('');
  const [billNo, setBillNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFind = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    const res = await base44.functions.invoke('findLabReport', { mobile, billNo });
    setLoading(false);
    if (res.data?.success) {
      setResult(res.data);
    } else {
      setError(res.data?.error || 'Report not found. Please check your details.');
    }
  };

  const openReport = (reportId) => {
    window.open(`/lab-report-view?resultId=${reportId}`, '_blank');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #5b5fcf 0%, #7c3aed 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'Arial, sans-serif'
    }}>
      {/* Logo / branding */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: '28px', fontWeight: 'bold', color: '#fff'
        }}>
          <FileText size={32} color="#fff" />
        </div>
        <div style={{ color: '#fff', fontSize: '14px', opacity: 0.85 }}>Medical Laboratory Reports</div>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '32px 28px',
        width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px', color: '#1e293b' }}>
          Find Medical Report
        </h2>

        <form onSubmit={handleFind}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1',
              borderRadius: '8px', overflow: 'hidden', background: '#f8fafc'
            }}>
              <span style={{ padding: '0 12px', color: '#94a3b8' }}>📱</span>
              <input
                type="tel"
                placeholder="Mobile No"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                required
                style={{
                  flex: 1, padding: '12px 8px', border: 'none', background: 'transparent',
                  fontSize: '14px', outline: 'none', color: '#1e293b'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1',
              borderRadius: '8px', overflow: 'hidden', background: '#f8fafc'
            }}>
              <span style={{ padding: '0 12px', color: '#94a3b8' }}>🔒</span>
              <input
                type="text"
                placeholder="Bill No / Order No"
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                required
                style={{
                  flex: 1, padding: '12px 8px', border: 'none', background: 'transparent',
                  fontSize: '14px', outline: 'none', color: '#1e293b'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', background: '#5b5fcf', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Please wait...</> : <><Search size={18} /> Find Report</>}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: '16px', padding: '12px', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: '8px',
            color: '#dc2626', fontSize: '13px', textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '20px' }}>
            <div style={{
              padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: '#166534'
            }}>
              <strong>{result.patient?.name}</strong> — Order: {result.order?.order_number}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              {result.reports.length} report{result.reports.length > 1 ? 's' : ''} found:
            </p>
            {result.reports.map((r) => (
              <button
                key={r.id}
                onClick={() => openReport(r.id)}
                style={{
                  width: '100%', padding: '12px 14px', marginBottom: '8px',
                  background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: '13px', color: '#1e293b', textAlign: 'left'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{r.test_name}</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                    {r.result_date ? new Date(r.result_date).toLocaleDateString('en-GB') : ''} · {r.status}
                  </div>
                </div>
                <ExternalLink size={16} color="#5b5fcf" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
        Horizon ClinicSuite · Medical Laboratory System
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}