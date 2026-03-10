import React, { useState, useEffect } from 'react';
import { AlertTriangle, Users } from 'lucide-react';

const TEAL = '#0d9488';
const GOLD = '#d4a017';

// ── Live clock ──────────────────────────────────────────────────────────────
export function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-light tabular-nums">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

// ── Emergency banner strip (top) ────────────────────────────────────────────
export function EmergencyBannerStrip({ banner }) {
  const colors = {
    urgent:  'bg-red-600',
    warning: 'bg-amber-500',
    info:    'bg-blue-600',
  };
  return (
    <div
      className={`${colors[banner.severity] || 'bg-red-600'} text-white absolute top-0 left-0 right-0 z-30 flex items-center gap-5 px-8`}
      style={{ minHeight: 64 }}
    >
      <AlertTriangle className="w-7 h-7 flex-shrink-0 animate-pulse" />
      <span className="font-black text-xl tracking-wide mr-3 flex-shrink-0">{banner.title}</span>
      <span className="text-white/90 text-lg flex-1 min-w-0 truncate">{banner.message}</span>
      <span className="text-white/50 text-sm uppercase tracking-widest flex-shrink-0">{banner.severity}</span>
    </div>
  );
}

// ── Scrolling ticker bar (bottom) ────────────────────────────────────────────
export function TickerBar({ text }) {
  if (!text) return null;
  const repeated = `${text}   •   ${text}   •   ${text}   •   ${text}`;
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 bg-black/85 text-white overflow-hidden flex items-center"
      style={{ height: 48 }}
    >
      <div
        className="flex-shrink-0 flex items-center h-full px-4 font-black text-sm uppercase tracking-widest"
        style={{ background: TEAL, minWidth: 100 }}
      >
        NOTICE
      </div>
      <div className="overflow-hidden flex-1 h-full flex items-center">
        <div
          className="whitespace-nowrap text-base font-medium"
          style={{ animation: 'tickerScroll 40s linear infinite', paddingLeft: '100%' }}
        >
          {repeated}
        </div>
      </div>
    </div>
  );
}

// ── Now Serving queue panel (right sidebar) ──────────────────────────────────
export function QueuePanel({ tokens = [] }) {
  const top3 = tokens.slice(0, 3);
  return (
    <div className="absolute top-0 right-0 bottom-0 z-20 flex flex-col" style={{ width: '22%' }}>
      <div className="h-full flex flex-col bg-slate-950/95 border-l-2 border-white/10">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#0f766e' }}>
          <Users className="w-6 h-6 text-white flex-shrink-0" />
          <div>
            <p className="text-white font-black text-xl leading-none">Now Serving</p>
            <p className="text-teal-200 text-xs mt-0.5">Please wait to be called</p>
          </div>
        </div>

        {/* Token list */}
        <div className="flex-1 flex flex-col justify-center gap-4 p-5">
          {top3.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-6xl font-black text-white/10 mb-3">—</p>
              <p className="text-white/30 text-sm uppercase tracking-wider">No active tokens</p>
            </div>
          ) : (
            top3.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 text-center transition-all"
                style={{
                  background: i === 0 ? TEAL : 'rgba(255,255,255,0.06)',
                  border: i === 0 ? `2px solid ${GOLD}` : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: i === 0 ? GOLD : 'rgba(255,255,255,0.4)' }}>
                  {i === 0 ? '▶ CALLING NOW' : `NEXT · ${i}`}
                </p>
                <p
                  className="font-black text-white leading-none"
                  style={{ fontSize: i === 0 ? '4rem' : '2.5rem' }}
                >
                  {t.token_number || t.display_number || String(t)}
                </p>
                {t.counter_name && (
                  <p className="text-white/50 text-sm mt-2 uppercase tracking-wide">{t.counter_name}</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 text-center">
          <p className="text-white/20 text-xs uppercase tracking-widest">Horizon ClinicSuite</p>
        </div>
      </div>
    </div>
  );
}

// ── Idle / welcome screen (no playlist assigned) ─────────────────────────────
export function IdleScreen({ screen, themeStyle, hasBanner, hasTicker, hasQueue, queueTokens }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: themeStyle }}>
      {hasBanner && <EmergencyBannerStrip banner={hasBanner} />}

      <div className={`text-center px-16 ${hasBanner ? 'pt-20' : ''}`} style={{ maxWidth: 900 }}>
        {screen?.logo_url && (
          <img
            src={screen.logo_url}
            alt="Clinic Logo"
            className="h-28 object-contain mx-auto mb-10 drop-shadow-xl"
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
        <h1
          className="font-black text-white leading-none drop-shadow-2xl"
          style={{ fontSize: '8rem', textShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        >
          Welcome
        </h1>
        {screen?.clinic_name && (
          <p className="text-4xl font-light mt-5 text-white/70">{screen.clinic_name}</p>
        )}
        <div className="mt-10 w-24 h-1 mx-auto rounded-full opacity-50" style={{ background: GOLD }} />
        <p className="text-2xl text-white/50 mt-10 font-light">
          Please take a seat · You will be called shortly
        </p>
        <p className="text-7xl font-light text-white/30 mt-12 tabular-nums">
          <Clock />
        </p>
      </div>

      {hasQueue && <QueuePanel tokens={queueTokens} />}
      {hasTicker && <TickerBar text={screen?.ticker_text} />}
    </div>
  );
}

// ── Slide progress dots ───────────────────────────────────────────────────────
export function ProgressDots({ total, current }) {
  if (total <= 1) return null;
  return (
    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: i === current ? 28 : 8,
            background: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </div>
  );
}