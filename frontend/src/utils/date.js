// Format a Date as YYYY-MM-DD in the browser's local timezone.
// Date#toISOString() converts to UTC first, which shifts the calendar day
// for anyone not on UTC (e.g. a local Monday becomes Sunday or Tuesday).
export function toLocalISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
