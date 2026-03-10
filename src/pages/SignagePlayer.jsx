import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, AlertTriangle } from 'lucide-react';

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

function TextSlide({ item }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-20 text-center"
      style={{ background: item.background_color || 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)' }}>
      {item.headline && (
        <h1 className="text-7xl font-bold text-white mb-8 leading-tight drop-shadow-lg">{item.headline}</h1>
      )}
      {item.body_text && (
        <p className="text-3xl text-white/90 leading-relaxed max-w-5xl">{item.body_text}</p>
      )}
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
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const loadContent = useCallback(async () => {
    if (!screenKey) { setError('No screen key provided'); setLoading(false); return; }
    try {
      const screens = await base44.entities.ClinicScreen.filter({ screen_key: screenKey });
      if (!screens.length) { setError('Screen not found'); setLoading(false); return; }
      const s = screens[0];
      setScreen(s);
      await base44.entities.ClinicScreen.update(s.id, { last_seen_at: new Date().toISOString() });

      const now = new Date();
      const allBanners = await base44.entities.EmergencyBanner.filter({ is_active: true });
      setBanners(allBanners.filter(b => {
        if (b.start_at && new Date(b.start_at) > now) return false;
        if (b.end_at && new Date(b.end_at) < now) return false;
        return true;
      }));

      if (s.assigned_playlist_id) {
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

  useEffect(() => { loadContent(); const iv = setInterval(loadContent, 60000); return () => clearInterval(iv); }, [loadContent]);

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
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)' }}>
      <Monitor className="w-20 h-20 text-white/30 mb-6" />
      <h1 className="text-5xl font-bold text-white">Welcome</h1>
      <p className="text-white/50 text-xl mt-4">{error}</p>
    </div>
  );

  const hasBanner = banners.length > 0;
  const currentItem = items[currentIdx];

  if (!items.length) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)' }}>
      {hasBanner && <BannerStrip banner={banners[0]} />}
      <div className={hasBanner ? 'pt-16' : ''}>
        <h1 className="text-8xl font-bold text-white text-center drop-shadow-lg">Welcome</h1>
        {screen?.clinic_name && <p className="text-4xl text-white/70 text-center mt-4">{screen.clinic_name}</p>}
        <p className="text-2xl text-white/50 text-center mt-10">Please take a seat · You will be called shortly</p>
        <p className="text-6xl font-light text-white/40 text-center mt-12"><Clock /></p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {hasBanner && <BannerStrip banner={banners[0]} />}

      <div className="absolute inset-0" style={{ top: hasBanner ? 60 : 0 }}>
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
              {currentItem.type === 'text' && <TextSlide item={currentItem} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      {items.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-10">
          {items.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentIdx ? 'bg-white w-6' : 'bg-white/30 w-2'}`} />
          ))}
        </div>
      )}

      {/* Clock overlay */}
      <div className="absolute top-4 right-6 z-10 text-white/30 text-xl font-light" style={{ top: hasBanner ? 70 : 16 }}>
        <Clock />
      </div>
    </div>
  );
}