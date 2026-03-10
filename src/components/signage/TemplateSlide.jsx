import React from 'react';

// Brand colors: teal primary, gold accent
const TEAL = '#0d9488';
const TEAL_DARK = '#115e59';
const GOLD = '#d4a017';
const GOLD_LIGHT = '#f59e0b';

const GRADIENTS = {
  teal: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
  dark: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  gold: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
};

// ── HERO layout ─────────────────────────────────────────────────────────────
function HeroLayout({ item }) {
  const bg = item.background_color || GRADIENTS.teal;
  const isGradient = bg.startsWith('linear') || bg.startsWith('#0d') || bg.startsWith('#11');
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-16"
      style={{ background: bg }}>
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: GOLD }} />
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: GOLD }} />

      {item.headline && (
        <h1 className="text-7xl font-black text-white leading-tight mb-8 drop-shadow-2xl" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          {item.headline}
        </h1>
      )}
      {item.body_text && (
        <p className="text-3xl text-white/90 leading-relaxed max-w-4xl font-light">
          {item.body_text}
        </p>
      )}
      {item.cta_text && (
        <div className="mt-12 px-12 py-5 rounded-2xl font-bold text-2xl text-white shadow-xl"
          style={{ background: GOLD, boxShadow: `0 8px 32px rgba(212,160,23,0.5)` }}>
          {item.cta_text}
        </div>
      )}
    </div>
  );
}

// ── SPLIT layout ─────────────────────────────────────────────────────────────
function SplitLayout({ item }) {
  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left: text panel */}
      <div className="flex-1 flex flex-col justify-center p-16 relative" style={{ background: TEAL_DARK }}>
        <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ background: GOLD }} />
        {item.template_type && (
          <div className="mb-6 self-start px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest"
            style={{ background: GOLD, color: '#1a1a1a' }}>
            {item.template_type?.replace(/_/g, ' ')}
          </div>
        )}
        {item.headline && (
          <h1 className="text-6xl font-black text-white leading-tight mb-6">
            {item.headline}
          </h1>
        )}
        {item.body_text && (
          <p className="text-2xl text-white/80 leading-relaxed mb-8 font-light">
            {item.body_text}
          </p>
        )}
        {item.cta_text && (
          <div className="self-start px-8 py-4 rounded-xl font-bold text-xl"
            style={{ background: GOLD, color: '#1a1a1a' }}>
            {item.cta_text}
          </div>
        )}
      </div>
      {/* Right: image or accent color */}
      <div className="w-2/5 flex items-center justify-center relative overflow-hidden"
        style={{ background: item.background_color || GRADIENTS.teal }}>
        {item.media_url ? (
          <img src={item.media_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-5xl">🏥</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(17,94,89,0.3), transparent)' }} />
      </div>
    </div>
  );
}

// ── BANNER layout ─────────────────────────────────────────────────────────────
function BannerLayout({ item }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: '#0f172a' }}>
      {item.media_url ? (
        <img src={item.media_url} alt="" className="w-full h-full object-cover opacity-40" />
      ) : (
        <div className="w-full h-full" style={{ background: item.background_color || GRADIENTS.teal }} />
      )}
      {/* Bottom banner */}
      <div className="absolute bottom-0 left-0 right-0 px-16 py-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)' }}>
        <div className="flex items-end justify-between">
          <div>
            {item.headline && (
              <h1 className="text-6xl font-black text-white leading-tight drop-shadow-lg">
                {item.headline}
              </h1>
            )}
            {item.body_text && (
              <p className="text-2xl text-white/80 mt-3 font-light">{item.body_text}</p>
            )}
          </div>
          {item.cta_text && (
            <div className="flex-shrink-0 ml-12 px-8 py-4 rounded-xl font-bold text-xl"
              style={{ background: GOLD, color: '#1a1a1a' }}>
              {item.cta_text}
            </div>
          )}
        </div>
        {/* Gold accent line at very bottom */}
        <div className="mt-6 h-1.5 rounded-full" style={{ background: GOLD, width: 80 }} />
      </div>
    </div>
  );
}

// ── SIDEBAR layout ─────────────────────────────────────────────────────────────
function SidebarLayout({ item }) {
  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-16 text-center"
        style={{ background: item.background_color || GRADIENTS.teal }}>
        {item.headline && (
          <h1 className="text-6xl font-black text-white leading-tight mb-8 drop-shadow-lg">
            {item.headline}
          </h1>
        )}
        {item.body_text && (
          <p className="text-2xl text-white/90 leading-relaxed max-w-2xl font-light">
            {item.body_text}
          </p>
        )}
        {item.cta_text && (
          <div className="mt-10 px-10 py-4 rounded-xl font-bold text-xl"
            style={{ background: GOLD, color: '#1a1a1a' }}>
            {item.cta_text}
          </div>
        )}
      </div>
      {/* Sidebar info strip */}
      <div className="w-1/4 flex flex-col border-l-4 border-l-yellow-400"
        style={{ background: '#0f172a' }}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: GOLD }}>
              <span className="text-3xl">+</span>
            </div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Healthcare</p>
          </div>
          {item.template_type && (
            <div className="text-center px-3 py-2 rounded-lg w-full"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Content Type</p>
              <p className="text-white font-semibold capitalize text-sm">{item.template_type?.replace(/_/g, ' ')}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-white/30 text-xs">Horizon ClinicSuite</p>
        </div>
      </div>
    </div>
  );
}

// ── FULLSCREEN layout ─────────────────────────────────────────────────────────────
function FullscreenLayout({ item }) {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {item.media_url ? (
        <img src={item.media_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full" style={{ background: item.background_color || GRADIENTS.teal }} />
      )}
      {/* Optional text overlay */}
      {(item.headline || item.cta_text) && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 px-20"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }}>
          {item.headline && (
            <h1 className="text-7xl font-black text-white text-center leading-tight drop-shadow-2xl mb-6">
              {item.headline}
            </h1>
          )}
          {item.cta_text && (
            <div className="px-12 py-5 rounded-2xl font-bold text-2xl"
              style={{ background: GOLD, color: '#1a1a1a' }}>
              {item.cta_text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function TemplateSlide({ item }) {
  const layout = item.layout_style || 'hero';
  switch (layout) {
    case 'split': return <SplitLayout item={item} />;
    case 'banner': return <BannerLayout item={item} />;
    case 'sidebar': return <SidebarLayout item={item} />;
    case 'fullscreen': return <FullscreenLayout item={item} />;
    case 'hero':
    default: return <HeroLayout item={item} />;
  }
}