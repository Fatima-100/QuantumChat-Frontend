const STORAGE_KEY = 'qc_screen_time_v1';
const CHECKPOINT_MS = 15_000;

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
  const today = new Date(lastVisibleAt).toISOString().slice(0, 10);
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
  const today = new Date().toISOString().slice(0,10);
  const data = read();
  return data[today] || 0;
}

export default { start, stop, getToday };
