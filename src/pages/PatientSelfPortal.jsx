import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Calendar, FileText, User, Lock, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Video, Pill, ClipboardList,
  LogOut, Phone, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

// ── Session storage keys ───────────────────────────────────────────────────────
const SESSION_KEY = 'patient_portal_session';

function saveSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function portalLogin(action, payload) {
  const res = await base44.functions.invoke('patientPortalLogin', { action, ...payload });
  return res.data;
}
async function portalData(action, session) {
  const res = await base44.functions.invoke('patientPortalData', {
    action,
    session_token: session.session_token,
    patient_id: session.patient_id,
  });
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [step, setStep] = useState('mobile'); // mobile | otp
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const requestOtp = async () => {
    setError('');
    if (!mobile.trim()) { setError('Please enter your mobile number'); return; }
    setLoading(true);
    const data = await portalLogin('request_otp', { mobile: mobile.trim() }).catch(e => ({ error: e.message }));
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setPatientName(data.patient_name);
    setMaskedMobile(data.masked_mobile);
    setStep('otp');
    setResendCooldown(60);
  };

  const verifyOtp = async () => {
    setError('');
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setLoading(true);
    const data = await portalLogin('verify_otp', { mobile: mobile.trim(), otp }).catch(e => ({ error: e.message }));
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    saveSession(data);
    onLogin(data);
  };

  const portalStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #5b5fcf 0%, #7c3aed 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '20px', fontFamily: 'Arial, sans-serif',
  };
  const cardStyle = {
    background: '#fff', borderRadius: '12px', padding: '32px 28px',
    width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };
  const inputRowStyle = {
    display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1',
    borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', marginBottom: '16px',
  };
  const inputStyle = {
    flex: 1, padding: '12px 8px', border: 'none', background: 'transparent',
    fontSize: '14px', outline: 'none', color: '#1e293b',
  };
  const primaryBtnStyle = {
    width: '100%', padding: '13px', background: '#5b5fcf', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold',
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px',
  };
  const tealBtnStyle = {
    ...primaryBtnStyle,
    background: 'linear-gradient(90deg, #0ea5e9 0%, #14b8a6 100%)',
    cursor: 'pointer', opacity: 1,
  };

  return (
    <div style={portalStyle}>
      {/* Logo */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 10px',
        }}>
          <Activity size={32} color="#fff" />
        </div>
        <div style={{ color: '#fff', fontSize: '14px', opacity: 0.85 }}>Horizon ClinicSuite</div>
      </div>

      <div style={cardStyle}>
        {step === 'mobile' ? (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px', color: '#1e293b' }}>
              Login
            </h2>
            <div style={inputRowStyle}>
              <span style={{ padding: '0 12px', color: '#94a3b8' }}>👤</span>
              <input
                type="tel"
                placeholder="Mobile No / Username"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && requestOtp()}
                style={inputStyle}
              />
            </div>
            {error && (
              <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '14px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button onClick={requestOtp} disabled={loading} style={primaryBtnStyle}>
              {loading ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Please wait...</> : 'Login'}
            </button>
            <button onClick={() => window.location.href = '/find-lab-report'} style={tealBtnStyle}>
              Find Medical Report
            </button>
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
              Need access? Contact your clinic reception.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px', color: '#1e293b' }}>
              Enter OTP
            </h2>
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#166534', textAlign: 'center' }}>
              Welcome, <strong>{patientName}</strong>! Code sent to <strong>{maskedMobile}</strong>
            </div>
            <div style={inputRowStyle}>
              <span style={{ padding: '0 12px', color: '#94a3b8' }}>🔒</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                autoFocus
                style={{ ...inputStyle, textAlign: 'center', fontSize: '20px', letterSpacing: '0.4em', fontFamily: 'monospace' }}
              />
            </div>
            {error && (
              <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '14px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button onClick={verifyOtp} disabled={loading} style={primaryBtnStyle}>
              {loading ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Please wait...</> : 'Verify & Sign In'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
              <button onClick={() => { setStep('mobile'); setOtp(''); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                ← Change number
              </button>
              {resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <button onClick={requestOtp} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b5fcf', fontWeight: 'bold' }}>
                  Resend OTP
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
        Horizon ClinicSuite · Medical Laboratory System
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AppointmentsTab({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalData('get_appointments', session).then(d => { setData(d); setLoading(false); });
  }, []);

  const statusColor = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-teal-100 text-teal-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    'no-show': 'bg-orange-100 text-orange-700',
    'checked-in': 'bg-purple-100 text-purple-700',
    'in-progress': 'bg-yellow-100 text-yellow-700',
  };

  if (loading) return <LoadingCard />;

  const AppCard = ({ appt }) => (
    <Card className="border border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={`text-xs ${statusColor[appt.status] || 'bg-slate-100 text-slate-700'}`}>
                {appt.status?.replace('-', ' ')}
              </Badge>
              {appt.type && (
                <Badge variant="outline" className="text-xs capitalize">{appt.type.replace('_', ' ')}</Badge>
              )}
              {appt.is_telehealth && (
                <Badge className="bg-violet-100 text-violet-700 text-xs">
                  <Video className="w-3 h-3 mr-1" /> Telehealth
                </Badge>
              )}
            </div>
            <p className="font-semibold text-slate-900">
              {format(new Date(appt.start_time), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-slate-500 text-sm">{format(new Date(appt.start_time), 'h:mm a')}</p>
            {appt.provider_name && (
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-medium">Provider:</span> {appt.provider_name}
              </p>
            )}
            {appt.location_name && (
              <p className="text-sm text-slate-600">
                <span className="font-medium">Location:</span> {appt.location_name}
              </p>
            )}
            {appt.reason && (
              <p className="text-sm text-slate-500 mt-1 italic">"{appt.reason}"</p>
            )}
            {appt.is_telehealth && appt.telehealth_link && (
              <a
                href={appt.telehealth_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <Video className="w-3 h-3" /> Join Video Call
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Upcoming ({data?.upcoming?.length || 0})
        </h3>
        {data?.upcoming?.length === 0 ? (
          <EmptyState icon={Calendar} text="No upcoming appointments" />
        ) : (
          <div className="space-y-3">
            {data.upcoming.map(a => <AppCard key={a.id} appt={a} />)}
          </div>
        )}
      </section>
      {/* Past */}
      {data?.past?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Past ({data.past.length})
          </h3>
          <div className="space-y-3">
            {data.past.slice(0, 10).map(a => <AppCard key={a.id} appt={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAB RESULTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function LabResultsTab({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    portalData('get_lab_results', session).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <LoadingCard />;

  const flagColor = {
    high: 'text-red-600',
    low: 'text-blue-600',
    critical_high: 'text-red-700 font-bold',
    critical_low: 'text-blue-700 font-bold',
    abnormal: 'text-orange-600',
  };

  return (
    <div className="space-y-3">
      {!data?.results?.length ? (
        <EmptyState icon={FileText} text="No released lab results yet" />
      ) : (
        data.results.map(r => (
          <Card key={r.id} className="border border-slate-200 overflow-hidden">
            <button
              className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-teal-100 text-teal-700 text-xs">{r.result_type}</Badge>
                    {r.entries?.some(e => e.is_abnormal) && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Abnormal Values
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {format(new Date(r.result_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded === r.id ? 'rotate-90' : ''}`} />
              </div>
            </button>
            {expanded === r.id && (
              <div className="border-t border-slate-100">
                {r.narrative_text && (
                  <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1">Report Summary</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.narrative_text}</p>
                  </div>
                )}
                {r.entries?.length > 0 && (
                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500 mb-3">Test Results</p>
                    <div className="space-y-2">
                      {r.entries.map((e, i) => (
                        <div key={i} className={`flex items-center justify-between py-2 border-b border-slate-50 last:border-0 ${e.is_abnormal ? 'bg-red-50 -mx-2 px-2 rounded' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{e.test_name}</p>
                            {e.reference_range_text && (
                              <p className="text-xs text-slate-400">Ref: {e.reference_range_text}</p>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            <p className={`text-sm font-semibold ${e.is_abnormal ? flagColor[e.abnormal_flag] || 'text-red-600' : 'text-slate-900'}`}>
                              {e.value_numeric ?? e.value_text ?? '—'} {e.unit || ''}
                              {e.abnormal_flag === 'high' || e.abnormal_flag === 'critical_high' ? ' ↑' : ''}
                              {e.abnormal_flag === 'low' || e.abnormal_flag === 'critical_low' ? ' ↓' : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL HISTORY TAB
// ─────────────────────────────────────────────────────────────────────────────
function MedicalHistoryTab({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState(null);

  useEffect(() => {
    portalData('get_medical_history', session).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <LoadingCard />;

  return (
    <div className="space-y-6">
      {/* Clinical Notes */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Visit Notes ({data?.notes?.length || 0})
        </h3>
        {!data?.notes?.length ? (
          <EmptyState icon={ClipboardList} text="No clinical notes available" />
        ) : (
          <div className="space-y-3">
            {data.notes.map(n => (
              <Card key={n.id} className="border border-slate-200 overflow-hidden">
                <button
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedNote(expandedNote === n.id ? null : n.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">{n.note_type}</Badge>
                        <Badge className="bg-green-100 text-green-700 text-xs capitalize">{n.status}</Badge>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {format(new Date(n.note_date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedNote === n.id ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {expandedNote === n.id && (
                  <div className="border-t border-slate-100 p-4 space-y-3">
                    {n.subjective && <NoteSection title="Subjective" text={n.subjective} />}
                    {n.objective && <NoteSection title="Objective" text={n.objective} />}
                    {n.assessment && <NoteSection title="Assessment" text={n.assessment} />}
                    {n.plan && <NoteSection title="Plan" text={n.plan} />}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Prescriptions */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Prescriptions ({data?.prescriptions?.length || 0})
        </h3>
        {!data?.prescriptions?.length ? (
          <EmptyState icon={Pill} text="No prescription history available" />
        ) : (
          <div className="space-y-3">
            {data.prescriptions.map(p => (
              <Card key={p.id} className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Pill className="w-4 h-4 text-teal-600" />
                        <p className="font-semibold text-slate-900">{p.drug_name}</p>
                        {p.strength && <span className="text-slate-500 text-sm">{p.strength}</span>}
                      </div>
                      {p.dosage_form && <p className="text-xs text-slate-400 mb-1">{p.dosage_form}</p>}
                      <p className="text-sm text-slate-600">{p.directions}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span>Qty: {p.quantity}</span>
                        {p.prescribed_date && (
                          <span>{format(new Date(p.prescribed_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={p.status === 'Dispensed' ? 'bg-green-100 text-green-700 text-xs' : 'bg-blue-100 text-blue-700 text-xs'}>
                      {p.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE TAB
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalData('get_profile', session).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <LoadingCard />;

  const row = (label, value) => value ? (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  ) : null;

  return (
    <Card className="border border-slate-200">
      <CardContent className="p-4 divide-y divide-slate-100">
        {row('Full Name', `${data?.first_name || ''} ${data?.last_name || ''}`.trim())}
        {row('PHN', data?.phn)}
        {row('Date of Birth', data?.date_of_birth ? format(new Date(data.date_of_birth), 'MMMM d, yyyy') : null)}
        {row('Gender', data?.gender)}
        {row('Blood Type', data?.blood_type)}
        {row('Mobile', data?.mobile)}
        {row('Phone', data?.phone)}
        {row('Email', data?.email)}
        {data?.allergies && (
          <div className="py-3">
            <p className="text-sm text-slate-500 mb-1">Allergies</p>
            <div className="flex items-start gap-2 bg-red-50 p-2 rounded border border-red-100">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{data.allergies}</p>
            </div>
          </div>
        )}
        {data?.chronic_conditions && (
          <div className="py-3">
            <p className="text-sm text-slate-500 mb-1">Chronic Conditions</p>
            <p className="text-sm text-slate-700">{data.chronic_conditions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function LoadingCard() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
    </div>
  );
}
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
function NoteSection({ title, text }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{title}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PORTAL (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
function PortalDashboard({ session, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">My Health Portal</p>
              <p className="text-xs text-teal-600">{session.patient_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-500">
            <LogOut className="w-4 h-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-4 mb-6 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">Hello, {session.patient_name.split(' ')[0]}!</p>
              <p className="text-teal-100 text-xs">Your health records are secure & private</p>
            </div>
            <div className="ml-auto flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs">
              <Lock className="w-3 h-3" /> Secure
            </div>
          </div>
        </div>

        <Tabs defaultValue="appointments">
          <TabsList className="grid grid-cols-4 w-full mb-6 bg-white border border-slate-200">
            <TabsTrigger value="appointments" className="text-xs py-2">
              <Calendar className="w-3.5 h-3.5 mr-1" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="labs" className="text-xs py-2">
              <FileText className="w-3.5 h-3.5 mr-1" /> Labs
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs py-2">
              <ClipboardList className="w-3.5 h-3.5 mr-1" /> History
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs py-2">
              <User className="w-3.5 h-3.5 mr-1" /> Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <AppointmentsTab session={session} />
          </TabsContent>
          <TabsContent value="labs">
            <LabResultsTab session={session} />
          </TabsContent>
          <TabsContent value="history">
            <MedicalHistoryTab session={session} />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileTab session={session} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="text-center text-xs text-slate-400 py-6">
        🔒 Your health data is private and encrypted
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function PatientSelfPortal() {
  const [session, setSession] = useState(() => loadSession());
  const [validating, setValidating] = useState(!!loadSession());

  useEffect(() => {
    const existing = loadSession();
    if (!existing) { setValidating(false); return; }
    // Validate session with backend
    portalData('verify_session', existing)
      .then(d => {
        if (d.ok) {
          setSession(existing);
        } else {
          clearSession();
          setSession(null);
        }
        setValidating(false);
      })
      .catch(() => {
        clearSession();
        setSession(null);
        setValidating(false);
      });
  }, []);

  const handleLogin = (sessionData) => setSession(sessionData);
  const handleLogout = () => { clearSession(); setSession(null); };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen onLogin={handleLogin} />;
  return <PortalDashboard session={session} onLogout={handleLogout} />;
}