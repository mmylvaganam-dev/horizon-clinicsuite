import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, AlertTriangle, Users } from 'lucide-react';
import TemplateSlide from '../components/signage/TemplateSlide';

const THEMES = {
  default: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
  dark: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  light: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  warm: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  branded: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
};

function BannerStrip({ banner }) {
  const colors = { urgent: 'bg-red-600', warning: 'bg-amber-500', info: 'bg-blue-600' };
  return (
    <div className={`${colors[banner.severity] || 'bg-blue-600'} text-white px-6 py-3 flex items-center gap-4 absolute top-0 left-0 right-0 z-20`} style={{ minHeight: 60 }}>
      <AlertTriangle className="w-6 h-6 flex-shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <span className="font-bold text-lg mr-3">{banner.title}</span>
        <span className="text-white/90">{banner.message}</span>
      </div>
      <span className="text-white/60 text-sm flex-shrink-0 uppercase tracking-wide">{banner.severity}</span>
    </div>
  );
}

function TickerBar({ text }) {
  if (!text) return null;
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 text-white overflow-hidden" style={{ height: 44 }}>
      <div className="flex items-center h-full">
        <div className="bg-teal-600 px-3 h-full flex items-center text-sm font-bold flex-shrink-0">NOTICE</div>
        <div className="overflow-hidden flex-1 h-full flex items-center">
          <div className="whitespace-nowrap text-sm font-medium" style={{
            display: 'inline-block',
            animation: 'tickerScroll 30s linear infinite',
            paddingLeft: '100%'
          }}>
            {text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueuePanel({ queueTokens = [] }) {
  const now_serving = queueTokens.slice(0, 3);
  return (
    <div className="absolute top-0 right-0 bottom-0 z-10 flex flex-col" style={{ width: '22%' }}>
      <div className="bg-slate-900/90 backdrop-blur h-full flex flex-col border-l border-white/10">
        <div className="bg-teal-700 px-4 py-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-lg">Now Serving</span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-4 p-4">
          {now_serving.length === 0 ? (
            <div className="text-center">
              <p className="text-4xl font-bold text-white/30">—</p>
              <p className="text-white/30 text-sm mt-2">No active tokens</p>
            </div>
          ) : now_serving.map((t, i) => (
            <div key={i} className={`rounded-xl p-4 text-center ${i === 0 ? 'bg-teal-600' : 'bg-white/10'}`}>
              <p className="text-white/60 text-xs mb-1">{i === 0 ? 'CALLING NOW' : `NEXT ${i}`}</p>
              <p className={`font-black text-white ${i === 0 ? 'text-5xl' : 'text-3xl'}`}>{t.token_number || t.display_number || t}</p>
              {t.counter_name && <p className="text-white/60 text-sm mt-1">{t.counter_name}</p>}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/10 text-center">
          <p className="text-white/30 text-xs">Please wait for your number to be called</p>
        </div>
      </div>
    </div>
  );
}

function TextSlide({ item }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-20 text-center"
      style={{ background: item.background_color || THEMES.default }}>
      {item.headline && <h1 className="text-7xl font-bold text-white mb-8 leading-tight drop-shadow-lg">{item.headline}</h1>}
      {item.body_text && <p className="text-3xl text-white/90 leading-relaxed max-w-5xl">{item.body_text}</p>}
      {item.cta_text && (
        <div className="mt-14 px-14 py-7 bg-white/20 backdrop-blur rounded-3xl border border-white/30">
          <p className="text-2xl font-semibold text-white">{item.cta_text}</p>
        </div>
      )}
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
}

export default function SignagePlayer() {
  const urlParams = new URLSearchParams(window.location.search);
  const screenKey = urlParams.get('screenKey');
  const [screen, setScreen] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [banners, setBanners] = useState([]);
  const [queueTokens, setQueueTokens] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const refreshCheckRef = useRef(null);
  const lastRefreshAtRef = useRef(null);

  const loadContent = useCallback(async () => {
    if (!screenKey) { setError('No screen key provided'); setLoading(false); return; }
    try {
      const screens = await base44.entities.ClinicScreen.filter({ screen_key: screenKey });
      if (!screens.length) { setError('Screen not found'); setLoading(false); return; }
      const s = screens[0];
      setScreen(s);

      // Heartbeat
      await base44.entities.ClinicScreen.update(s.id, { last_seen_at: new Date().toISOString() });

      // Check refresh command
      if (s.refresh_requested_at && s.refresh_requested_at !== lastRefreshAtRef.current) {
        lastRefreshAtRef.current = s.refresh_requested_at;
        // Reload page if this is a new refresh command
        if (lastRefreshAtRef.current) {
          window.location.reload();
          return;
        }
      }

      const now = new Date();
      const allBanners = await base44.entities.EmergencyBanner.filter({ is_active: true });
      setBanners(allBanners.filter(b => {
        if (b.start_at && new Date(b.start_at) > now) return false;
        if (b.end_at && new Date(b.end_at) < now) return false;
        return true;
      }));

      // Load queue tokens if queue panel is enabled
      if (s.queue_panel_enabled) {
        try {
          const tokens = await base44.entities.QueueToken.filter({ status: 'called' });
          setQueueTokens(tokens.slice(0, 3));
        } catch (_) {
          setQueueTokens([]);
        }
      }

      if (s.assigned_playlist_id) {
        // Get playlist to check health_edu_mode
        let playlist = null;
        try {
          const pls = await base44.entities.Playlist.filter({ id: s.assigned_playlist_id });
          playlist = pls[0];
        } catch (_) {}

        const piList = await base44.entities.PlaylistItem.filter({ playlist_id: s.assigned_playlist_id });
        const sorted = piList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const loaded = [];
        for (const pi of sorted) {
          const sis = await base44.entities.SignageItem.filter({ id: pi.signage_item_id });
          if (!sis.length) continue;
          const si = sis[0];
          if (!si.is_active) continue;
          if (si.start_at && new Date(si.start_at) > now) continue;
          if (si.end_at && new Date(si.end_at) < now) continue;
          // Health education mode filter
          if (playlist?.health_edu_mode && !si.is_health_education) continue;
          // Only approved/published content goes on TV
          if (si.approval_status && si.approval_status === 'draft') continue;
          loaded.push({ ...si, display_seconds: pi.display_seconds || 10 });
        }
        setItems(loaded);
        setCurrentIdx(0);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [screenKey]);

  useEffect(() => {
    loadContent();
    // Heartbeat every 60s, content refresh every 60s
    const iv = setInterval(loadContent, 60000);
    return () => clearInterval(iv);
  }, [loadContent]);

  useEffect(() => {
    if (!items.length) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const secs = (items[currentIdx]?.display_seconds || 10) * 1000;
    timerRef.current = setTimeout(() => setCurrentIdx(i => (i + 1) % items.length), secs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIdx, items]);

  if (loading) return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <p className="text-2xl">Loading signage...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: THEMES.default }}>
      <Monitor className="w-20 h-20 text-white/30 mb-6" />
      <h1 className="text-5xl font-bold text-white">Welcome</h1>
      <p className="text-white/50 text-xl mt-4">{error}</p>
    </div>
  );

  const hasBanner = banners.length > 0;
  const currentItem = items[currentIdx];
  const hasQueue = screen?.queue_panel_enabled;
  const hasTicker = screen?.ticker_enabled && screen?.ticker_text;
  const themeStyle = THEMES[screen?.theme || 'default'];

  // Portrait mode: rotate the whole screen
  const isPortrait = screen?.orientation === 'portrait';

  if (!items.length) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: themeStyle }}>
      {hasBanner && <BannerStrip banner={banners[0]} />}
      <div className={hasBanner ? 'pt-16' : ''}>
        {screen?.logo_url && <img src={screen.logo_url} alt="Logo" className="h-24 object-contain mx-auto mb-8" />}
        <h1 className="text-8xl font-bold text-white text-center drop-shadow-lg">Welcome</h1>
        {screen?.clinic_name && <p className="text-4xl text-white/70 text-center mt-4">{screen.clinic_name}</p>}
        <p className="text-2xl text-white/50 text-center mt-10">Please take a seat · You will be called shortly</p>
        <p className="text-6xl font-light text-white/40 text-center mt-12"><Clock /></p>
      </div>
      {hasTicker && <TickerBar text={screen.ticker_text} />}
      {hasQueue && <QueuePanel queueTokens={queueTokens} />}
    </div>
  );

  const bannerHeight = hasBanner ? 60 : 0;
  const tickerHeight = hasTicker ? 44 : 0;
  const queueWidth = hasQueue ? '22%' : '0%';

  return (
    <div className={`fixed inset-0 bg-black overflow-hidden ${isPortrait ? 'portrait-screen' : ''}`}>
      {hasBanner && <BannerStrip banner={banners[0]} />}

      {/* Logo corner */}
      {screen?.logo_url && (
        <div className="absolute z-10" style={{ top: bannerHeight + 16, left: 16 }}>
          <img src={screen.logo_url} alt="Logo" className="h-12 object-contain opacity-80" />
        </div>
      )}

      {/* Clock */}
      <div className="absolute z-10 text-white/30 text-xl font-light" style={{ top: bannerHeight + 16, right: hasQueue ? 'calc(22% + 16px)' : 24 }}>
        <Clock />
      </div>

      {/* Main content area */}
      <div className="absolute" style={{ top: bannerHeight, left: 0, right: queueWidth, bottom: tickerHeight }}>
        <AnimatePresence mode="wait">
          {currentItem && (
            <motion.div key={`${currentItem.id}-${currentIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="w-full h-full">
              {currentItem.type === 'image' && (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <img src={currentItem.media_url} alt={currentItem.title} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              {currentItem.type === 'video' && (
                <video src={currentItem.media_url} autoPlay muted loop className="w-full h-full object-contain bg-black" />
              )}
              {currentItem.type === 'webpage' && (
                <iframe src={currentItem.media_url} className="w-full h-full border-0" title={currentItem.title} />
              )}
              {currentItem.type === 'text' && (
                currentItem.layout_style && currentItem.layout_style !== 'hero'
                  ? <TemplateSlide item={currentItem} />
                  : <TextSlide item={currentItem} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        {items.length > 1 && (
          <div className="absolute flex justify-center gap-2 z-10" style={{ bottom: tickerHeight + 12, left: 0, right: 0 }}>
            {items.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentIdx ? 'bg-white w-6' : 'bg-white/30 w-2'}`} />
            ))}
          </div>
        )}
      </div>

      {hasQueue && <QueuePanel queueTokens={queueTokens} />}
      {hasTicker && <TickerBar text={screen.ticker_text} />}

      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}