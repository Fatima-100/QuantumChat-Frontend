const READ_PREFIX = 'qc_read_';
const ACTIVITY_PREFIX = 'qc_activity_';
const UNREAD_PREFIX = 'qc_unread_';

function readKey(userId, conversationKey) {
  return `${READ_PREFIX}${userId}_${conversationKey}`;
}

function activityKey(userId, conversationKey) {
  return `${ACTIVITY_PREFIX}${userId}_${conversationKey}`;
}

function unreadKey(userId, conversationKey) {
  return `${UNREAD_PREFIX}${userId}_${conversationKey}`;
}

export function conversationKeyForUser(peerId) {
  return `dm:${peerId}`;
}

export function conversationKeyForGroup(groupId) {
  return `group:${groupId}`;
}

export function getLastReadAt(userId, conversationKey) {
  try {
    return localStorage.getItem(readKey(userId, conversationKey)) || null;
  } catch {
    return null;
  }
}

export function getUnreadCount(userId, conversationKey) {
  try {
    const raw = localStorage.getItem(unreadKey(userId, conversationKey));
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function setUnreadCount(userId, conversationKey, count) {
  try {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    const key = unreadKey(userId, conversationKey);
    if (n <= 0) localStorage.removeItem(key);
    else localStorage.setItem(key, String(n));
  } catch {
    // ignore quota
  }
}

export function incrementUnreadCount(userId, conversationKey, by = 1) {
  const next = getUnreadCount(userId, conversationKey) + Math.max(1, Math.floor(by));
  setUnreadCount(userId, conversationKey, next);
  return next;
}

export function clearUnreadCount(userId, conversationKey) {
  setUnreadCount(userId, conversationKey, 0);
}

export function markConversationRead(userId, conversationKey, iso = new Date().toISOString()) {
  try {
    localStorage.setItem(readKey(userId, conversationKey), iso);
    clearUnreadCount(userId, conversationKey);
  } catch {
    // ignore quota
  }
}

export function setConversationActivity(userId, conversationKey, { at, from } = {}) {
  if (!at) return;
  try {
    localStorage.setItem(activityKey(userId, conversationKey), JSON.stringify({ at, from: from || null }));
  } catch {
    // ignore quota
  }
}

export function getConversationActivity(userId, conversationKey) {
  try {
    const raw = localStorage.getItem(activityKey(userId, conversationKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.at) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isUnreadConversation(userId, conversationKey, lastActivityIso, lastFromId) {
  if (getUnreadCount(userId, conversationKey) > 0) return true;
  if (!lastActivityIso) return false;
  if (lastFromId && String(lastFromId) === String(userId)) return false;
  const readAt = getLastReadAt(userId, conversationKey);
  if (!readAt) return true;
  return new Date(lastActivityIso).getTime() > new Date(readAt).getTime();
}
