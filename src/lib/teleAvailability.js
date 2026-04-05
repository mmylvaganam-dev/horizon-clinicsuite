/**
 * Shared utility: generate available booking slots for a provider on a given date,
 * excluding booked appointments and time-off blocks.
 */

/**
 * Parse "HH:MM" → { h, m }
 */
function parseTime(str) {
  const [h, m] = (str || '00:00').split(':').map(Number);
  return { h, m };
}

/**
 * Given a provider's availability records, time-off records, and existing bookings,
 * return an array of available Date objects for the given date.
 *
 * @param {Date} date
 * @param {Array} availabilityRecords  - TeleProviderAvailability[]
 * @param {Array} timeOffRecords       - TeleProviderTimeOff[]
 * @param {Array} existingBookings     - TeleAppointment[] with scheduled_time
 * @returns {Date[]}
 */
export function generateAvailableSlots(date, availabilityRecords, timeOffRecords, existingBookings) {
  const dayOfWeek = date.getDay(); // 0=Sun
  const dateStr = formatDateStr(date);

  // Find the availability window for this day
  const dayAvail = availabilityRecords.find(
    a => a.day_of_week === dayOfWeek && a.is_active !== false
  );

  if (!dayAvail) return []; // provider not available this day

  // Check if entire day is blocked by time-off
  const fullyBlocked = timeOffRecords.some(t => {
    if (t.date_from > dateStr || t.date_to < dateStr) return false;
    return !t.is_partial_day;
  });

  if (fullyBlocked) return [];

  // Collect partial-day blocked ranges for this date
  const partialBlocks = timeOffRecords
    .filter(t => t.is_partial_day && t.date_from <= dateStr && t.date_to >= dateStr && t.blocked_from && t.blocked_to)
    .map(t => ({ from: parseTime(t.blocked_from), to: parseTime(t.blocked_to) }));

  // Collect booked slot times (as HH:MM strings on this date)
  const bookedKeys = new Set(
    existingBookings
      .filter(b => ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status) && b.scheduled_time)
      .map(b => {
        const d = new Date(b.scheduled_time);
        const isSameDate =
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth() &&
          d.getDate() === date.getDate();
        if (!isSameDate) return null;
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })
      .filter(Boolean)
  );

  const slotDuration = dayAvail.slot_duration_minutes || 30;
  const start = parseTime(dayAvail.start_time);
  const end = parseTime(dayAvail.end_time);

  const slots = [];
  let cur = { h: start.h, m: start.m };
  const now = new Date();

  while (cur.h * 60 + cur.m + slotDuration <= end.h * 60 + end.m) {
    const slotDate = new Date(date);
    slotDate.setHours(cur.h, cur.m, 0, 0);

    const slotKey = `${String(cur.h).padStart(2, '0')}:${String(cur.m).padStart(2, '0')}`;
    const isPast = slotDate <= now;
    const isBooked = bookedKeys.has(slotKey);
    const isPartialBlocked = partialBlocks.some(b => {
      const slotMin = cur.h * 60 + cur.m;
      const blockFrom = b.from.h * 60 + b.from.m;
      const blockTo = b.to.h * 60 + b.to.m;
      return slotMin >= blockFrom && slotMin < blockTo;
    });

    if (!isPast && !isBooked && !isPartialBlocked) {
      slots.push(slotDate);
    }

    // Advance by slot duration
    const totalMin = cur.h * 60 + cur.m + slotDuration;
    cur = { h: Math.floor(totalMin / 60), m: totalMin % 60 };
  }

  return slots;
}

/**
 * Returns true if provider has any availability on the given date (ignoring bookings).
 */
export function isProviderAvailableOnDate(date, availabilityRecords, timeOffRecords) {
  const dayOfWeek = date.getDay();
  const dateStr = formatDateStr(date);

  const hasSchedule = availabilityRecords.some(a => a.day_of_week === dayOfWeek && a.is_active !== false);
  if (!hasSchedule) return false;

  const fullyBlocked = timeOffRecords.some(t => {
    if (t.date_from > dateStr || t.date_to < dateStr) return false;
    return !t.is_partial_day;
  });

  return !fullyBlocked;
}

export function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}