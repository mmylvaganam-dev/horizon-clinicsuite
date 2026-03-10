import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor } from 'lucide-react';
import TemplateSlide from '../components/signage/TemplateSlide';
import {
  Clock,
  EmergencyBannerStrip,
  TickerBar,
  QueuePanel,
  IdleScreen,
  ProgressDots,
} from '../components/signage/PlayerOverlays';

const THEMES = {
  default:  'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
  dark:     'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  light:    'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
  warm:     'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  branded:  'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
};

const BANNER_H  = 64;   // px — emergency banner height
const TICKER_H  = 48;   // px — ticker bar height
const QUEUE_W   = '22%'; // queue panel width

export default function SignagePlayer() {
  const screenKey = new URLSearchParams(window.location.search).get('screenKey');

  const [screen,      setScreen]      = useState(null);
  const [items,       setItems]       = useState([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [banners,     setBanners]     = useState([]);
  const [queueTokens, setQueueTokens] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const slideTimerRef    = useRef(null);
  const lastRefreshAtRef = useRef(null);

  // ── Load / refresh all content from DB ────────────────────────────────────
  const loadContent = useCallback(async () => {
    if (!screenKey) { setError('No screen key provided'); setLoading(false); return; }

    try {
      // 1. Resolve screen record
      const [s] = await base44.entities.ClinicScreen.filter({ screen_key: screenKey });
      if (!s) { setError('Screen not found'); setLoading(false); return; }
      setScreen(s);

      // 2. Heartbeat ping
      await base44.entities.ClinicScreen.update(s.id, { last_seen_at: new Date().toISOString() });

      // 3. Remote-refresh command
      if (s.refresh_requested_at && s.refresh_requested_at !== lastRefreshAtRef.current) {
        lastRefreshAtRef.current = s.refresh_requested_at;
        window.location.reload();
        return;
      }

      // 4. Active emergency banners (time-gated)
      const now = new Date();
      const allBanners = await base44.entities.EmergencyBanner.filter({ is_active: true });
      setBanners(allBanners.filter(b => {
        if (b.start_at && new Date(b.start_at) > now) return false;
        if (b.end_at   && new Date(b.end_at)   < now) return false;
        return true;
      }));

      // 5. Queue tokens (only if panel is enabled)
      if (s.queue_panel_enabled) {
        const tokens = await base44.entities.QueueToken.filter({ status: 'called' }).catch(() => []);
        setQueueTokens(tokens.slice(0, 3));
      } else {
        setQueueTokens([]);
      }

      // 6. Playlist items
      if (!s.assigned_playlist_id) { setLoading(false); return; }

      const [playlist]  = await base44.entities.Playlist.filter({ id: s.assigned_playlist_id }).catch(() => [null]);
      const piList      = await base44.entities.PlaylistItem.filter({ playlist_id: s.assigned_playlist_id });
      const sorted      = piList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const loaded = [];
      for (const pi of sorted) {
        const [si] = await base44.entities.SignageItem.filter({ id: pi.signage_item_id });
        if (!si)                                                      continue; // missing
        if (!si.is_active)                                            continue; // inactive
        if (si.start_at && new Date(si.start_at) > now)              continue; // not yet
        if (si.end_at   && new Date(si.end_at)   < now)              continue; // expired
        if (playlist?.health_edu_mode && !si.is_health_education)    continue; // edu filter
        if (si.approval_status === 'draft')                          continue; // not approved
        loaded.push({ ...si, display_seconds: pi.display_seconds || 10 });
      }

      setItems(loaded);
      setCurrentIdx(prev => (prev >= loaded.length ? 0 : prev)); // keep position if possible
    } catch (err) {
      console.error('[SignagePlayer] loadContent error:', err);
    }

    setLoading(false);
  }, [screenKey]);

  // ── Bootstrap + 60-second auto-refresh ────────────────────────────────────
  useEffect(() => {
    loadContent();
    const iv = setInterval(loadContent, 60_000);
    return () => clearInterval(iv);
  }, [loadContent]);

  // ── Auto-advance slides based on each item's display_seconds ──────────────
  useEffect(() => {
    if (!items.length) return;
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    const ms = (items[currentIdx]?.display_seconds || 10) * 1000;
    slideTimerRef.current = setTimeout(() => setCurrentIdx(i => (i + 1) % items.length), ms);
    return () => { if (slideTimerRef.current) clearTimeout(slideTimerRef.current); };
  }, [currentIdx, items]);

  // ── Derived flags ──────────────────────────────────────────────────────────
  const activeBanner  = banners[0] || null;
  const hasBanner     = !!activeBanner;
  const hasTicker     = !!(screen?.ticker_enabled && screen?.ticker_text);
  const hasQueue      = !!screen?.queue_panel_enabled;
  const themeStyle    = THEMES[screen?.theme || 'default'];
  const isPortrait    = screen?.orientation === 'portrait';
  const currentItem   = items[currentIdx] || null;

  // Layout offsets
  const topOffset    = hasBanner ? BANNER_H : 0;
  const bottomOffset = hasTicker ? TICKER_H : 0;
  const rightOffset  = hasQueue  ? QUEUE_W  : '0%';

  // ── Loading splash ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950">
      <div className="w-20 h-20 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mb-8" />
      <p className="text-white/60 text-2xl font-light tracking-widest uppercase">Loading…</p>
    </div>
  );

  // ── Error / no screen key ─────────────────────────────────────────────────
  if (error) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: THEMES.default }}>
      <Monitor className="w-24 h-24 text-white/20 mb-8" />
      <h1 className="text-white font-black" style={{ fontSize: '5rem' }}>Welcome</h1>
      <p className="text-white/40 text-2xl mt-6 font-light">{error}</p>
    </div>
  );

  // ── Idle screen (no playlist / empty playlist) ────────────────────────────
  if (!items.length) return (
    <IdleScreen
      screen={screen}
      themeStyle={themeStyle}
      hasBanner={activeBanner}
      hasTicker={hasTicker}
      hasQueue={hasQueue}
      queueTokens={queueTokens}
    />
  );

  // ── Full player ───────────────────────────────────────────────────────────
  return (
    <div className={`fixed inset-0 bg-black overflow-hidden select-none ${isPortrait ? 'portrait-mode' : ''}`}>

      {/* Emergency banner — always on top */}
      {hasBanner && <EmergencyBannerStrip banner={activeBanner} />}

      {/* Logo — top-left corner, below banner */}
      {screen?.logo_url && (
        <div className="absolute z-20" style={{ top: topOffset + 16, left: 20 }}>
          <img
            src={screen.logo_url}
            alt="Clinic Logo"
            className="h-12 object-contain opacity-80 drop-shadow-lg"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Clock — top-right corner (shifts left if queue panel is shown) */}
      <div
        className="absolute z-20 text-white/30 font-light"
        style={{ top: topOffset + 18, right: hasQueue ? `calc(${QUEUE_W} + 20px)` : 20, fontSize: '1.5rem' }}
      >
        <Clock />
      </div>

      {/* ── Main content area ── */}
      <div
        className="absolute"
        style={{ top: topOffset, left: 0, right: rightOffset, bottom: bottomOffset }}
      >
        <AnimatePresence mode="wait">
          {currentItem && (
            <motion.div
              key={`${currentItem.id}-${currentIdx}`}
              initial={{ opacity: 0, scale: 1.01 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              className="w-full h-full"
            >
              <TemplateSlide item={currentItem} />
            </motion.div>
          )}
        </AnimatePresence>

        <ProgressDots total={items.length} current={currentIdx} />
      </div>

      {/* Queue panel — right side */}
      {hasQueue && <QueuePanel tokens={queueTokens} />}

      {/* Ticker — bottom strip */}
      {hasTicker && <TickerBar text={screen.ticker_text} />}

      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-25%); }
        }
        .portrait-mode {
          transform-origin: top left;
        }
      `}</style>
    </div>
  );
}