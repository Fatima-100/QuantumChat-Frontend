const STORAGE_KEY = 'qc_screen_time_v1';
const CHECKPOINT_MS = 15_000;

// Local calendar-day key (YYYY-MM-DD), NOT UTC. Using toISOString() here
// would bucket by UTC day, which silently disagrees with a browser whose
// local timezone differs from UTC — see ScreenTimeChart.jsx for the other
// half of this fix.
function localDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let running = false;
let lastVisibleAt = null;
let checkpointTimer = null;

function read() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function write(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    window.dispatchEvent(new CustomEvent('qc:screen-time:updated'));
    return true;
  } catch { return false; }
}

function checkpoint() {
  if (!running || lastVisibleAt == null) return;
  const now = Date.now();
  const delta = now - lastVisibleAt;
  if (delta <= 0) return;
  const today = localDayKey(new Date(lastVisibleAt));
  const data = read();
  data[today] = (data[today] || 0) + delta;
  if (write(data)) lastVisibleAt = now;
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    lastVisibleAt = Date.now();
  } else {
    checkpoint();
    lastVisibleAt = null;
  }
}

export function start() {
  if (running) return;
  running = true;
  lastVisibleAt = document.visibilityState === 'visible' ? Date.now() : null;
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', checkpoint);
  checkpointTimer = window.setInterval(checkpoint, CHECKPOINT_MS);
}

export function stop() {
  if (!running) return;
  checkpoint();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', checkpoint);
  if (checkpointTimer !== null) window.clearInterval(checkpointTimer);
  checkpointTimer = null;
  lastVisibleAt = null;
  running = false;
}

export function getToday() {
  const today = localDayKey(new Date());
  const data = read();
  return data[today] || 0;
}

export default { start, stop, getToday };
