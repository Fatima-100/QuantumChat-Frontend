const DB_NAME = 'quantumchat-sw';
const STORE_AUTH = 'auth';
const STORE_CONTENT = 'content';
const DB_VERSION = 2;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_AUTH)) {
        req.result.createObjectStore(STORE_AUTH);
      }
      if (!req.result.objectStoreNames.contains(STORE_CONTENT)) {
        req.result.createObjectStore(STORE_CONTENT);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(store, key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Best-effort only.
  }
}

async function idbDelete(store, key) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-fatal.
  }
}

export function mirrorAuthForServiceWorker(token, apiUrl) {
  if (typeof indexedDB === 'undefined') return;
  if (token) idbSet(STORE_AUTH, 'token', token);
  if (apiUrl) idbSet(STORE_AUTH, 'apiBase', apiUrl);
}

export function clearAuthForServiceWorker() {
  if (typeof indexedDB === 'undefined') return;
  idbDelete(STORE_AUTH, 'token');
}

export function cacheNotificationContent(tag, { title, body }) {
  if (typeof indexedDB === 'undefined' || !tag) return;
  idbSet(STORE_CONTENT, tag, { title, body, cachedAt: Date.now() });
}
