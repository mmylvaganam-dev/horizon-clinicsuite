/**
 * dateUtils.js - Centralised date formatting for Sri Lanka (Asia/Colombo, UTC+5:30)
 *
 * Use these helpers INSTEAD of date-fns `format()` anywhere in the app.
 * They all display time in Colombo timezone regardless of the server/browser locale.
 *
 * USAGE:
 *   import { formatSL } from '@/components/utils/dateUtils';
 *   formatSL(someDate, 'MMM d, yyyy h:mm a')  → "Mar 4, 2026 2:30 PM"  (in Colombo time)
 */

const TZ = 'Asia/Colombo';

const f = (d, opts) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts }).format(d);

const fGB = (d, opts) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(d);

/**
 * formatSL(dateInput, pattern)
 * Supports common date-fns-style patterns:
 *  'MMM d, yyyy'          → "Mar 4, 2026"
 *  'MMM d, yyyy h:mm a'   → "Mar 4, 2026 2:30 PM"
 *  'MMMM d, yyyy'         → "March 4, 2026"
 *  'MMM d, h:mm a'        → "Mar 4, 2:30 PM"
 *  'MMM d'                → "Mar 4"
 *  'dd/MM/yyyy'           → "04/03/2026"
 *  'dd/MM/yyyy HH:mm'     → "04/03/2026 14:30"
 *  'HH:mm'                → "14:30"
 *  'h:mm a'               → "2:30 PM"
 *  'yyyy-MM-dd'           → "2026-03-04"
 *  'PPP' / 'PP'           → "Mar 4, 2026"
 */
export function formatSL(dateInput, pattern) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d)) return '';

  switch (pattern) {
    case 'MMM d, yyyy':
      return f(d, { month: 'short', day: 'numeric', year: 'numeric' });
    case 'MMM d, yyyy h:mm a':
      return f(d, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    case 'MMMM d, yyyy':
      return f(d, { month: 'long', day: 'numeric', year: 'numeric' });
    case 'MMMM yyyy':
      return f(d, { month: 'long', year: 'numeric' });
    case 'MMM d, h:mm a':
      return f(d, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    case 'MMM d':
      return f(d, { month: 'short', day: 'numeric' });
    case 'MMM yyyy':
      return f(d, { month: 'short', year: 'numeric' });
    case 'dd/MM/yyyy':
      return fGB(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
    case 'dd/MM/yyyy HH:mm': {
      const date = fGB(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const time = fGB(d, { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${date} ${time}`;
    }
    case 'HH:mm':
      return fGB(d, { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'h:mm a':
      return f(d, { hour: 'numeric', minute: '2-digit', hour12: true });
    case 'yyyy-MM-dd':
      return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    case 'PPP':
    case 'PP':
    case 'P':
      return f(d, { month: 'short', day: 'numeric', year: 'numeric' });
    case 'p':
      return f(d, { hour: 'numeric', minute: '2-digit', hour12: true });
    case 'Pp':
      return f(d, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    default:
      return f(d, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }
}

/**
 * getSLToday() → "2026-03-04"  (today in Colombo time, YYYY-MM-DD)
 */
export function getSLToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/**
 * getSLNow() → current JS Date (use formatSL to display in Colombo time)
 */
export function getSLNow() {
  return new Date();
}

/**
 * isSLToday(date) → true if the given date is today in Colombo timezone
 */
export function isSLToday(dateInput) {
  return getSLToday() === formatSL(dateInput, 'yyyy-MM-dd');
}