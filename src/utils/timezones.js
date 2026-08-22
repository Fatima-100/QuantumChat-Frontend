// A reasonably complete fallback list for browsers that don't support
// Intl.supportedValuesOf('timeZone') (Safari < 17, older browsers). Covers
// one representative zone per UTC offset region so nothing is unreachable.
const FALLBACK_TIMEZONES = [
  'UTC',
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Sao_Paulo', 'America/Mexico_City', 'America/Bogota',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Europe/Istanbul',
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Nairobi',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Asia/Jakarta',
  'Australia/Perth', 'Australia/Sydney', 'Pacific/Auckland',
];

let cached = null;

/** Full IANA timezone list, natively where supported, fallback otherwise. */
export function getTimezoneList() {
  if (cached) return cached;
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      cached = Intl.supportedValuesOf('timeZone');
      return cached;
    }
  } catch {
    // fall through to the static list below
  }
  cached = FALLBACK_TIMEZONES;
  return cached;
}

/** Best-effort browser-detected zone, used only to pre-select a sensible
 * default in the dropdown — never auto-saved without the user choosing Save. */
export function detectBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
