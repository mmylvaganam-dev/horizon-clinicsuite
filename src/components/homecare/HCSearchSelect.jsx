/**
 * Reusable searchable dropdown for Home Care reports.
 * Filters a list of options as the user types and lets them pick.
 * Falls back gracefully if no options — user can still type freely.
 */
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown, X } from 'lucide-react';

export default function HCSearchSelect({ value, onChange, options = [], placeholder = 'Search…', allowFreeText = true }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 20);

  const handleSelect = (label) => {
    setQuery(label);
    onChange(label);
    setOpen(false);
  };

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (allowFreeText) onChange(v);
    setOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pr-16"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((o, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-700 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(o.label); }}
            >
              <span className="font-medium">{o.label}</span>
              {o.sub && <span className="ml-2 text-xs text-slate-400">{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}