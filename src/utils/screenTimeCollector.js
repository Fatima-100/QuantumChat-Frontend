const STORAGE_KEY = 'qc_screen_time_v1';

let running = false;
let lastVisibleAt = null;

function read() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function write(obj) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch {}
}

function onVisibilityChange() {
  const state = document.visibilityState;
  if (state === 'visible') {
    lastVisibleAt = Date.now();
  } else {
    if (lastVisibleAt) {
      const delta = Date.now() - lastVisibleAt;
      const today = new Date().toISOString().slice(0,10);
      const data = read();
      data[today] = (data[today] || 0) + delta;
      write(data);
    }
    lastVisibleAt = null;
  }
}

export function start() {
  if (running) return;
  running = true;
  lastVisibleAt = document.visibilityState === 'visible' ? Date.now() : null;
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', onVisibilityChange);
}

export function stop() {
  if (!running) return;
  onVisibilityChange();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', onVisibilityChange);
  running = false;
}

export function getToday() {
  const today = new Date().toISOString().slice(0,10);
  const data = read();
  return data[today] || 0;
}

export default { start, stop, getToday };
