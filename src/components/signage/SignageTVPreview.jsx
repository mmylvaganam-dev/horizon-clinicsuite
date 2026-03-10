import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const THEMES = {
  default: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
  dark: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  light: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  warm: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  branded: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
};

function TextSlide({ item }) {
  const textColor = item.background_color ? '#fff' : '#fff';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
      style={{ background: item.background_color || THEMES.default }}>
      {item.headline && <h1 className="text-2xl font-bold text-white mb-3 leading-tight">{item.headline}</h1>}
      {item.body_text && <p className="text-sm text-white/90 leading-relaxed max-w-xs">{item.body_text}</p>}
      {item.cta_text && (
        <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur rounded-xl border border-white/30">
          <p className="text-xs font-semibold text-white">{item.cta_text}</p>
        </div>
      )}
    </div>
  );
}

export default function SignageTVPreview({ items = [], screen = null, onClose }) {
  const [idx, setIdx] = useState(0);

  const current = items[idx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-3xl">
        {/* TV Frame */}
        <div className="relative bg-slate-800 rounded-2xl p-3 shadow-2xl" style={{ border: '4px solid #334155' }}>
          {/* Screen bezel top */}
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-xs font-medium">{screen?.name || 'Preview'}</span>
              {screen?.orientation === 'portrait' && <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">Portrait</span>}
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white h-6 w-6 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Screen area - 16:9 */}
          <div className="relative overflow-hidden rounded-lg" style={{ paddingBottom: screen?.orientation === 'portrait' ? '177%' : '56.25%' }}>
            <div className="absolute inset-0 bg-black">
              {/* Content */}
              <AnimatePresence mode="wait">
                {current && (
                  <motion.div key={`${current.id}-${idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="w-full h-full">
                    {current.type === 'image' && current.media_url && (
                      <img src={current.media_url} alt={current.title} className="w-full h-full object-cover" />
                    )}
                    {current.type === 'text' && <TextSlide item={current} />}
                    {current.type === 'video' && (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <p className="text-white/50 text-sm">📹 Video: {current.title}</p>
                      </div>
                    )}
                    {current.type === 'webpage' && (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <p className="text-white/50 text-sm">🌐 Webpage: {current.media_url}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ticker bar overlay */}
              {screen?.ticker_enabled && screen?.ticker_text && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 overflow-hidden">
                  <div className="whitespace-nowrap" style={{
                    display: 'inline-block',
                    animation: 'ticker 20s linear infinite',
                    paddingLeft: '100%'
                  }}>
                    {screen.ticker_text} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; {screen.ticker_text}
                  </div>
                </div>
              )}

              {/* Queue panel overlay */}
              {screen?.queue_panel_enabled && (
                <div className="absolute top-2 right-2 bottom-2 w-24 bg-black/70 rounded-lg p-2 flex flex-col items-center justify-center border border-white/20">
                  <p className="text-white/60 text-xs text-center mb-1">Now Serving</p>
                  <p className="text-white font-bold text-xl">—</p>
                </div>
              )}

              {/* Logo overlay */}
              {screen?.logo_url && (
                <div className="absolute top-2 left-2">
                  <img src={screen.logo_url} alt="Logo" className="h-6 object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-2 px-2">
            <Button size="sm" variant="ghost" className="text-slate-400 h-7" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-1">
              {items.map((_, i) => (
                <div key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full cursor-pointer transition-all ${i === idx ? 'bg-teal-400 w-4' : 'bg-slate-600 w-1.5'}`} />
              ))}
            </div>
            <Button size="sm" variant="ghost" className="text-slate-400 h-7" disabled={idx === items.length - 1} onClick={() => setIdx(i => i + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-slate-500 mt-1">{current?.title || 'No content'} · {idx + 1} / {items.length}</p>
        </div>

        <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>
    </div>
  );
}