// Sri Lanka Timezone: Asia/Colombo (UTC+5:30)
export const TIMEZONE = 'Asia/Colombo';

// ─── GLOBAL TIMEZONE OVERRIDE ───────────────────────────────────────────────
// Force ALL Intl.DateTimeFormat and date-fns operations to use Colombo time.
// Call initSLTimezone() once at app startup (main.jsx).
export const initSLTimezone = () => {
  try {
    // Override the default timezone used by Intl
    const OrigDateTimeFormat = Intl.DateTimeFormat;
    const patchedFormat = function (locale, options = {}) {
      if (!options.timeZone) {
        options = { ...options, timeZone: TIMEZONE };
      }
      return new OrigDateTimeFormat(locale, options);
    };
    patchedFormat.supportedLocalesOf = OrigDateTimeFormat.supportedLocalesOf.bind(OrigDateTimeFormat);
    Intl.DateTimeFormat = patchedFormat;

    // Also patch Date.prototype.toLocaleString family
    const origToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function (locale, options = {}) {
      if (!options.timeZone) options = { ...options, timeZone: TIMEZONE };
      return origToLocaleString.call(this, locale, options);
    };

    const origToLocaleDateString = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function (locale, options = {}) {
      if (!options.timeZone) options = { ...options, timeZone: TIMEZONE };
      return origToLocaleDateString.call(this, locale, options);
    };

    const origToLocaleTimeString = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = function (locale, options = {}) {
      if (!options.timeZone) options = { ...options, timeZone: TIMEZONE };
      return origToLocaleTimeString.call(this, locale, options);
    };

    console.log('✅ Timezone set to Asia/Colombo (Sri Lanka) globally');
  } catch (e) {
    console.warn('Could not patch global timezone:', e);
  }
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

const fmt = (date, options) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, ...options }).format(
    date instanceof Date ? date : new Date(date)
  );

// HH:mm  e.g. "14:30"
export const formatSLTime = (date) =>
  fmt(date, { hour: '2-digit', minute: '2-digit', hour12: false });

// DD/MM/YYYY  e.g. "04/03/2026"
export const formatSLDate = (date) =>
  fmt(date, { day: '2-digit', month: '2-digit', year: 'numeric' });

// DD/MM/YYYY HH:mm  e.g. "04/03/2026 14:30"
export const formatSLDateTime = (date) =>
  `${formatSLDate(date)} ${formatSLTime(date)}`;

// "Thursday, 4 Mar 2026"
export const formatSLDateLong = (date) =>
  fmt(date, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

// "Mar 4, 2026"  (replaces date-fns "MMM d, yyyy")
export const formatSLDateMedium = (date) =>
  fmt(date, { month: 'short', day: 'numeric', year: 'numeric' });

// "Mar 4, 2026 2:30 PM"  (replaces date-fns "MMM d, yyyy h:mm a")
export const formatSLDateTimeMedium = (date) =>
  fmt(date, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });

// YYYY-MM-DD string for today in Colombo (for DB queries)
export const getSLTodayISO = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD natively
};

// Return a JS Date representing "now" correctly offset for SL
export const getSLNow = () => new Date();

// Return ISO string with Sri Lanka offset (+05:30) for saving to DB
// Use this instead of new Date().toISOString() when recording timestamps
export const getSLNowISO = () => {
  const now = new Date();
  // SL is UTC+5:30 = 330 minutes
  const offsetMs = 330 * 60 * 1000;
  const slTime = new Date(now.getTime() + offsetMs);
  // Replace the Z suffix with +05:30
  return slTime.toISOString().replace('Z', '+05:30');
};

// Return today's date as YYYY-MM-DD in Colombo timezone (alias for getSLTodayISO)
export const getSLToday = getSLTodayISO;

// Parse a date string and return formatted SL date
export const slFormat = (dateInput, pattern) => {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d)) return '';

  // Common date-fns-style patterns mapped to Intl options
  const patterns = {
    'MMM d, yyyy': { month: 'short', day: 'numeric', year: 'numeric' },
    'MMM d, yyyy h:mm a': { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true },
    'MMMM d, yyyy': { month: 'long', day: 'numeric', year: 'numeric' },
    'dd/MM/yyyy': { day: '2-digit', month: '2-digit', year: 'numeric' },
    'dd/MM/yyyy HH:mm': null, // handled below
    'h:mm a': { hour: 'numeric', minute: '2-digit', hour12: true },
    'HH:mm': { hour: '2-digit', minute: '2-digit', hour12: false },
    'MMM d': { month: 'short', day: 'numeric' },
    'MMM d, h:mm a': { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true },
  };

  if (pattern === 'dd/MM/yyyy HH:mm') return formatSLDateTime(d);

  const opts = patterns[pattern];
  if (opts) return fmt(d, opts);

  // Fallback: return default medium format
  return formatSLDateMedium(d);
};