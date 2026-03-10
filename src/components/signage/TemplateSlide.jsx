import React, { useState } from 'react';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const TEAL       = '#0d9488';
const TEAL_DARK  = '#115e59';
const TEAL_MID   = '#0f766e';
const GOLD       = '#d4a017';
const GOLD_LIGHT = '#f59e0b';

const BG_TEAL = `linear-gradient(140deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`;
const BG_DARK = 'linear-gradient(140deg, #0f172a 0%, #1e293b 100%)';

function fallbackBg(color) {
  return color && color !== '#0d9488' ? color : BG_TEAL;
}

// ── Graceful image with fallback ─────────────────────────────────────────────
function SafeImage({ src, alt = '', className = '', style = {} }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center`}
        style={{ background: BG_TEAL, ...style }}>
        <div className="text-center opacity-30">
          <div className="text-7xl mb-4">🏥</div>
          <p className="text-white text-xl font-light uppercase tracking-widest">Clinic</p>
        </div>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} />;
}

// ── Graceful video with fallback ─────────────────────────────────────────────
function SafeVideo({ src, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ background: BG_DARK }}>
        <div className="text-center opacity-30">
          <div className="text-8xl mb-4">▶</div>
          <p className="text-white text-2xl font-light tracking-widest uppercase">Video unavailable</p>
        </div>
      </div>
    );
  }
  return (
    <video
      src={src}
      autoPlay muted loop playsInline
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

// ── HERO  ────────────────────────────────────────────────────────────────────
// Full-bleed centered headline. Best for announcements, health tips.
function HeroLayout({ item }) {
  const bg = fallbackBg(item.background_color);
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden text-center"
      style={{ background: bg, padding: '6vw 8vw' }}>

      {/* Top + bottom gold accent bars */}
      <div className="absolute top-0 left-0 right-0" style={{ height: 6, background: GOLD }} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 6, background: GOLD }} />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />

      {item.template_type && (
        <div className="mb-6 px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest"
          style={{ background: GOLD, color: '#111' }}>
          {item.template_type.replace(/_/g, ' ')}
        </div>
      )}

      {item.headline && (
        <h1 className="font-black text-white leading-tight drop-shadow-2xl"
          style={{ fontSize: 'clamp(3rem, 7vw, 7rem)', textShadow: '0 6px 30px rgba(0,0,0,0.45)', maxWidth: '90%' }}>
          {item.headline}
        </h1>
      )}

      {item.body_text && (
        <p className="font-light text-white/90 leading-relaxed mt-8"
          style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.8rem)', maxWidth: '75%' }}>
          {item.body_text}
        </p>
      )}

      {item.cta_text && (
        <div className="mt-12 px-10 py-5 rounded-2xl font-black shadow-2xl"
          style={{
            background: GOLD,
            color: '#111',
            fontSize: 'clamp(1.1rem, 2vw, 2rem)',
            boxShadow: `0 10px 40px rgba(212,160,23,0.55)`,
          }}>
          {item.cta_text}
        </div>
      )}
    </div>
  );
}

// ── SPLIT  ───────────────────────────────────────────────────────────────────
// Text left panel + image/colour right. Best for promos and services.
function SplitLayout({ item }) {
  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left – text */}
      <div className="flex flex-col justify-center relative overflow-hidden"
        style={{ width: '55%', background: TEAL_DARK, padding: '5vw 5vw 5vw 6vw' }}>

        {/* Left gold accent bar */}
        <div className="absolute top-0 left-0 bottom-0" style={{ width: 6, background: GOLD }} />

        {item.template_type && (
          <div className="self-start mb-5 px-4 py-1.5 rounded-full font-black uppercase tracking-widest"
            style={{ background: GOLD, color: '#111', fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>
            {item.template_type.replace(/_/g, ' ')}
          </div>
        )}

        {item.headline && (
          <h1 className="font-black text-white leading-tight"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 5.5rem)', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            {item.headline}
          </h1>
        )}

        {item.body_text && (
          <p className="font-light text-white/80 leading-relaxed mt-6"
            style={{ fontSize: 'clamp(1.1rem, 2.2vw, 2.2rem)', maxWidth: '90%' }}>
            {item.body_text}
          </p>
        )}

        {item.cta_text && (
          <div className="self-start mt-8 px-8 py-4 rounded-xl font-black"
            style={{
              background: GOLD, color: '#111',
              fontSize: 'clamp(1rem, 1.8vw, 1.8rem)',
              boxShadow: `0 6px 24px rgba(212,160,23,0.45)`,
            }}>
            {item.cta_text}
          </div>
        )}
      </div>

      {/* Right – image or colour accent */}
      <div className="flex-1 relative overflow-hidden" style={{ background: fallbackBg(item.background_color) }}>
        {item.media_url && (
          <SafeImage
            src={item.media_url}
            alt={item.headline || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Blend overlay towards left */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(17,94,89,0.35) 0%, transparent 40%)' }} />
      </div>
    </div>
  );
}

// ── BANNER  ──────────────────────────────────────────────────────────────────
// Full bleed media with gradient text overlay at bottom. Cinematic.
function BannerLayout({ item }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: BG_DARK }}>
      {item.media_url ? (
        <SafeImage
          src={item.media_url}
          alt={item.headline || ''}
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: fallbackBg(item.background_color) }} />
      )}

      {/* Bottom gradient scrim */}
      <div className="absolute bottom-0 left-0 right-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 55%, transparent 100%)', padding: '4vw 6vw 5vw' }}>

        <div className="flex items-end justify-between gap-12">
          <div className="flex-1 min-w-0">
            {item.template_type && (
              <div className="inline-block mb-4 px-4 py-1.5 rounded-full font-black uppercase tracking-widest"
                style={{ background: GOLD, color: '#111', fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>
                {item.template_type.replace(/_/g, ' ')}
              </div>
            )}
            {item.headline && (
              <h1 className="font-black text-white leading-tight"
                style={{ fontSize: 'clamp(2.5rem, 5.5vw, 6rem)', textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                {item.headline}
              </h1>
            )}
            {item.body_text && (
              <p className="font-light text-white/80 mt-4"
                style={{ fontSize: 'clamp(1.1rem, 2.2vw, 2.2rem)' }}>
                {item.body_text}
              </p>
            )}
          </div>

          {item.cta_text && (
            <div className="flex-shrink-0 px-8 py-5 rounded-2xl font-black"
              style={{
                background: GOLD, color: '#111',
                fontSize: 'clamp(1rem, 1.8vw, 1.8rem)',
                boxShadow: `0 8px 32px rgba(212,160,23,0.5)`,
              }}>
              {item.cta_text}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-full" style={{ height: 4, width: 80, background: GOLD }} />
      </div>
    </div>
  );
}

// ── SIDEBAR  ─────────────────────────────────────────────────────────────────
// Main content + right info strip. Best for health education.
function SidebarLayout({ item }) {
  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden"
        style={{ background: fallbackBg(item.background_color), padding: '5vw 6vw' }}>

        <div className="absolute top-0 left-0 right-0" style={{ height: 5, background: GOLD }} />

        {item.headline && (
          <h1 className="font-black text-white leading-tight drop-shadow-xl"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 5.5rem)' }}>
            {item.headline}
          </h1>
        )}
        {item.body_text && (
          <p className="font-light text-white/90 leading-relaxed mt-8"
            style={{ fontSize: 'clamp(1.2rem, 2.4vw, 2.4rem)', maxWidth: '80%' }}>
            {item.body_text}
          </p>
        )}
        {item.cta_text && (
          <div className="mt-10 px-10 py-4 rounded-xl font-black"
            style={{
              background: GOLD, color: '#111',
              fontSize: 'clamp(1rem, 1.8vw, 1.8rem)',
              boxShadow: `0 6px 24px rgba(212,160,23,0.45)`,
            }}>
            {item.cta_text}
          </div>
        )}
      </div>

      {/* Info sidebar */}
      <div className="flex flex-col overflow-hidden"
        style={{ width: '24%', background: '#0f172a', borderLeft: `4px solid ${GOLD}` }}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`, border: `3px solid ${GOLD}` }}>
              <span style={{ fontSize: '2rem' }}>🏥</span>
            </div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Healthcare</p>
          </div>

          {item.template_type && (
            <div className="w-full rounded-xl p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Content</p>
              <p className="font-bold text-white capitalize" style={{ fontSize: '1rem' }}>
                {item.template_type.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          {item.media_url && (
            <SafeImage
              src={item.media_url}
              className="w-full rounded-xl object-cover"
              style={{ height: '10vw', maxHeight: 160 }}
            />
          )}
        </div>
        <div className="py-3 border-t border-white/10 text-center">
          <p className="text-white/20 text-xs uppercase tracking-widest">Horizon ClinicSuite</p>
        </div>
      </div>
    </div>
  );
}

// ── FULLSCREEN  ──────────────────────────────────────────────────────────────
// Full bleed image. Optional headline overlay.
function FullscreenLayout({ item }) {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {item.media_url ? (
        <SafeImage
          src={item.media_url}
          alt={item.headline || ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: fallbackBg(item.background_color) }} />
      )}

      {(item.headline || item.body_text || item.cta_text) && (
        <div className="absolute inset-0 flex flex-col items-center justify-end"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 45%, transparent 70%)',
            padding: '0 6vw 5vw',
          }}>
          {item.headline && (
            <h1 className="font-black text-white text-center leading-tight drop-shadow-2xl"
              style={{ fontSize: 'clamp(3rem, 6.5vw, 7rem)', textShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
              {item.headline}
            </h1>
          )}
          {item.body_text && (
            <p className="font-light text-white/85 text-center mt-4"
              style={{ fontSize: 'clamp(1.2rem, 2.2vw, 2.2rem)' }}>
              {item.body_text}
            </p>
          )}
          {item.cta_text && (
            <div className="mt-8 px-12 py-5 rounded-2xl font-black"
              style={{
                background: GOLD, color: '#111',
                fontSize: 'clamp(1.1rem, 2vw, 2rem)',
                boxShadow: `0 10px 40px rgba(212,160,23,0.55)`,
              }}>
              {item.cta_text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── IMAGE SLIDE  ─────────────────────────────────────────────────────────────
// Direct image display — respects layout_style for text if also set.
function ImageSlide({ item }) {
  return (
    <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
      <SafeImage
        src={item.media_url}
        alt={item.title || ''}
        className="max-w-full max-h-full object-contain"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      {(item.headline || item.cta_text) && (
        <div className="absolute bottom-0 left-0 right-0 px-12 py-8 flex items-end justify-between gap-10"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
          <div>
            {item.headline && (
              <h2 className="font-black text-white leading-tight"
                style={{ fontSize: 'clamp(2rem, 4vw, 4rem)', textShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
                {item.headline}
              </h2>
            )}
            {item.body_text && (
              <p className="font-light text-white/80 mt-3"
                style={{ fontSize: 'clamp(1rem, 2vw, 2rem)' }}>
                {item.body_text}
              </p>
            )}
          </div>
          {item.cta_text && (
            <div className="flex-shrink-0 px-8 py-4 rounded-xl font-black"
              style={{ background: GOLD, color: '#111', fontSize: 'clamp(1rem, 1.6vw, 1.6rem)' }}>
              {item.cta_text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── VIDEO SLIDE  ─────────────────────────────────────────────────────────────
function VideoSlide({ item }) {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative">
      <SafeVideo src={item.media_url} className="w-full h-full object-contain" />
    </div>
  );
}

// ── WEBPAGE SLIDE  ───────────────────────────────────────────────────────────
function WebpageSlide({ item }) {
  return (
    <div className="w-full h-full bg-white">
      <iframe
        src={item.media_url}
        title={item.title || 'Webpage'}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Master renderer — routes by item.type then item.layout_style
// ════════════════════════════════════════════════════════════════════════════
export default function TemplateSlide({ item }) {
  if (!item) return null;

  // Non-text types get their own slide components
  if (item.type === 'image')   return <ImageSlide item={item} />;
  if (item.type === 'video')   return <VideoSlide item={item} />;
  if (item.type === 'webpage') return <WebpageSlide item={item} />;

  // Text type — route by layout_style
  switch (item.layout_style) {
    case 'split':      return <SplitLayout item={item} />;
    case 'banner':     return <BannerLayout item={item} />;
    case 'sidebar':    return <SidebarLayout item={item} />;
    case 'fullscreen': return <FullscreenLayout item={item} />;
    case 'hero':
    default:           return <HeroLayout item={item} />;
  }
}