import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Mail, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function TeleLogin() {
  const [step, setStep] = useState('email'); // email | otp
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    const session = localStorage.getItem('tele_patient_session');
    if (session) {
      window.location.href = createPageUrl('TelemedicinePatientPortal');
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('sendTeleOtp', { email: email.trim().toLowerCase() });
    setLoading(false);
    if (res.data?.success) {
      setStep('otp');
      setCountdown(60);
    } else {
      setError(res.data?.error || 'Failed to send OTP. Please try again.');
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('verifyTeleOtp', { email: email.trim().toLowerCase(), otp: otp.trim() });
    setLoading(false);
    if (res.data?.success) {
      localStorage.setItem('tele_patient_session', JSON.stringify(res.data.patient));
      window.location.href = createPageUrl('TelemedicinePatientPortal');
    } else {
      setError(res.data?.error || 'Invalid code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Video className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Virtual Clinic</h1>
          <p className="text-slate-500 text-sm">Secure patient portal — sign in with your email</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6 space-y-5">
            {step === 'email' && (
              <>
                <div>
                  <Label className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      className="pl-10"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && email && sendOtp()}
                    />
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <Button className="w-full" disabled={!email || loading} onClick={sendOtp}>
                  {loading ? 'Sending...' : <><ArrowRight className="w-4 h-4 mr-2" /> Send Login Code</>}
                </Button>
                <p className="text-xs text-center text-slate-400">
                  We'll send a 6-digit code to your email. No password needed.
                </p>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="bg-teal-50 rounded-lg px-4 py-3 text-sm text-teal-700 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>A 6-digit code was sent to <strong>{email}</strong>. Check your inbox.</span>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">Enter Code</Label>
                  <Input
                    className="mt-1 text-center text-2xl font-mono tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyOtp()}
                  />
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <Button className="w-full" disabled={otp.length !== 6 || loading} onClick={verifyOtp}>
                  {loading ? 'Verifying...' : <><ShieldCheck className="w-4 h-4 mr-2" /> Verify & Sign In</>}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button className="text-slate-400 hover:text-slate-600" onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
                    ← Change email
                  </button>
                  {countdown > 0 ? (
                    <span className="text-slate-400">Resend in {countdown}s</span>
                  ) : (
                    <button className="text-teal-600 font-medium flex items-center gap-1" onClick={sendOtp}>
                      <RefreshCw className="w-3.5 h-3.5" /> Resend code
                    </button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Don't have access? Contact your clinic to enable telemedicine on your account.
        </p>
      </div>
    </div>
  );
}