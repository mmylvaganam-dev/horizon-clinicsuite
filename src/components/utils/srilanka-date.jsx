// Sri Lanka Timezone: Asia/Colombo (UTC+5:30)
const TIMEZONE = 'Asia/Colombo';

// Format time in Sri Lanka timezone (HH:mm)
export const formatSLTime = (date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date || new Date());
};

// Format date in Sri Lanka timezone (DD/MM/YYYY)
export const formatSLDate = (date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(date || new Date());
};

// Format date and time together (DD/MM/YYYY HH:mm)
export const formatSLDateTime = (date) => {
  const d = date || new Date();
  return `${formatSLDate(d)} ${formatSLTime(d)}`;
};

// Format for display (e.g., "Thursday, 19 Feb 2026")
export const formatSLDateLong = (date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return formatter.format(date || new Date());
};

// Get current Sri Lanka date as YYYY-MM-DD (for database queries)
export const getSLTodayISO = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
};