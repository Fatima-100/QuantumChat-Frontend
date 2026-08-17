const ACTIVITY_KEY = 'qc_activity_feed_v1';
const MAX_ITEMS = 500;

function safeParse(raw) {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function makeId(item) {
  if (item.id) return `${item.type}:${item.id}`;
  // fallback stable key
  return `${item.type}:${item.actorId || ''}:${item.targetId || ''}:${item.messageId || ''}:${item.at || ''}`;
}

export function appendEvent(item) {
  if (!item || !item.type) return;
  const store = safeParse(localStorage.getItem(ACTIVITY_KEY));
  const next = Array.isArray(store) ? store : [];
  const now = new Date().toISOString();
  const normalized = { at: now, ...item };
  const id = makeId(normalized);
  // dedupe by id
  const exists = next.find((i) => makeId(i) === id);
  if (exists) return;
  next.unshift(normalized);
  if (next.length > MAX_ITEMS) next.length = MAX_ITEMS;
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function getEvents({ filter = 'all', limit = 100, cursor = 0 } = {}) {
  const store = safeParse(localStorage.getItem(ACTIVITY_KEY));
  let items = Array.isArray(store) ? store : [];
  if (filter && filter !== 'all') {
    items = items.filter((i) => i.type === filter);
  }
  return {
    data: items.slice(cursor, cursor + limit),
    nextCursor: cursor + limit < items.length ? cursor + limit : null,
  };
}

export function clearEvents() {
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {}
}

export default { appendEvent, getEvents, clearEvents };
