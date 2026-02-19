import { formatInTimeZone } from 'date-fns-tz';

// Sri Lanka Timezone: Asia/Colombo (UTC+5:30)
const TIMEZONE = 'Asia/Colombo';

// Format time in Sri Lanka timezone
export const formatSLTime = (date, formatStr = 'HH:mm') => {
  return formatInTimeZone(date || new Date(), TIMEZONE, formatStr);
};

// Format date in Sri Lanka timezone (DD/MM/YYYY)
export const formatSLDate = (date, formatStr = 'dd/MM/yyyy') => {
  return formatInTimeZone(date || new Date(), TIMEZONE, formatStr);
};

// Format date and time together
export const formatSLDateTime = (date, formatStr = 'dd/MM/yyyy HH:mm') => {
  return formatInTimeZone(date || new Date(), TIMEZONE, formatStr);
};

// Format for display (e.g., "Thursday, 19 Feb 2026")
export const formatSLDateLong = (date, formatStr = 'EEEE, d MMM yyyy') => {
  return formatInTimeZone(date || new Date(), TIMEZONE, formatStr);
};

// Get current Sri Lanka date as YYYY-MM-DD (for database queries)
export const getSLTodayISO = () => {
  const now = new Date();
  return formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
};