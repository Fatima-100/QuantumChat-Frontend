/**
 * On-device inverted index over decrypted message text.
 * Never uploads queries or plaintext — memory only.
 *
 * Also provides date-range filtering helpers so the search UI can combine a
 * text query with date filters (AND logic) without any server involvement.
 * All date math is done in the browser's LOCAL timezone to match the rest of
 * the app (see `isSameDay` / date separators in Chat.jsx).
 */

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}

/**
 * Build an inverted index from decrypted messages.
 *
 * Every message with an id is recorded in `docs` (so that non-text filters —
 * e.g. date-only — can still return attachment/media messages). Only messages
 * that actually carry text contribute to the inverted token index, so text
 * search results are unchanged from the text-only behavior.
 *
 * @param {Array<{ id?: string, _id?: string, text?: string|null, timestamp?: *, createdAt?: *, hasAttachment?: boolean }>} messages
 * @returns {{ docs: Map<string, object>, inverted: Map<string, Map<string, number>>, docCount: number }}
 */
export function normalizeAttachment(msg) {
  const attachment = msg?.attachment || (Array.isArray(msg?.attachments) ? msg.attachments[0] : null);
  if (!attachment || typeof attachment !== 'object') return null;
  const filename = String(attachment.filename || attachment.fileName || attachment.name || '').trim();
  const mimetype = String(attachment.mimetype || attachment.mimeType || attachment.type || '').toLowerCase().trim();
  return { filename, mimetype };
}

function classifyAttachment(attachment) {
  if (!attachment) return { kind: 'none', documentCategory: '', isPicture: false, isDocument: false };
  const { filename, mimetype } = attachment;
  const ext = filename.toLowerCase().split('.').pop();
  const isPicture = mimetype.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'avif'].includes(ext);
  const isVideo = mimetype.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv'].includes(ext);
  const isAudio = mimetype.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg'].includes(ext);
  const documentCategory = mimetype === 'application/pdf' || ext === 'pdf' ? 'pdf'
    : ['doc', 'docx'].includes(ext) || mimetype.includes('word') ? 'word'
      : ['xls', 'xlsx', 'csv'].includes(ext) || mimetype.includes('spreadsheet') ? 'spreadsheet'
        : ['ppt', 'pptx'].includes(ext) || mimetype.includes('presentation') ? 'presentation'
          : ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimetype.includes('zip') ? 'archive'
            : mimetype.startsWith('text/') || ['txt', 'md', 'json'].includes(ext) ? 'text' : '';
  const isDocument = Boolean(documentCategory);
  return { kind: isPicture ? 'picture' : isVideo ? 'video' : isAudio ? 'audio' : isDocument ? 'document' : 'file', documentCategory, isPicture, isDocument };
}

function extractDomains(text) {
  const domains = new Set();
  const matches = String(text || '').match(/(?:https?:\/\/|www\.)[^\s<>()]+/gi) || [];
  for (const raw of matches) {
    try {
      const url = new URL(raw.startsWith('www.') ? `https://${raw}` : raw);
      domains.add(url.hostname.toLowerCase().replace(/^www\./, ''));
    } catch { /* Ignore malformed URLs. */ }
  }
  return [...domains];
}

export function buildIndex(messages) {
  const docs = new Map();
  const inverted = new Map();

  for (const msg of messages || []) {
    const id = String(msg?.id || msg?._id || '');
    if (!id) continue;

    const text = typeof msg?.text === 'string' ? msg.text : '';
    const ts = msg?.timestamp ?? msg?.createdAt ?? null;
    const timestampMs = ts != null ? new Date(ts).getTime() : NaN;
    const attachment = normalizeAttachment(msg);
    const attachmentKind = classifyAttachment(attachment);
    const hasAttachment = Boolean(msg?.hasAttachment || attachment);
    const linkDomains = extractDomains(text);

    const tokens = text.trim() ? tokenize(text) : [];
    const tf = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    docs.set(id, {
      id,
      text,
      timestamp: ts,
      timestampMs,
      tokenCount: tokens.length,
      tf,
      hasAttachment,
      filename: attachment?.filename || '',
      mimetype: attachment?.mimetype || '',
      linkDomains,
      ...attachmentKind,
    });

    for (const [token, count] of tf) {
      let posting = inverted.get(token);
      if (!posting) {
        posting = new Map();
        inverted.set(token, posting);
      }
      posting.set(id, count);
    }
  }

  return { docs, inverted, docCount: docs.size };
}

/**
 * Rank documents by token-overlap / TF score (not plain includes()).
 * @param {{ docs: Map, inverted: Map, docCount: number }} index
 * @param {string} query
 * @returns {Array<{ id: string, text: string, timestamp: *, score: number }>}
 */
export function searchIndex(index, query) {
  if (!index?.docs?.size) return [];
  const q = String(query || '').trim();
  if (!q) return [];

  const queryTokens = tokenize(q);
  if (!queryTokens.length) return [];

  const uniqueQuery = [...new Set(queryTokens)];
  const scores = new Map();

  for (const token of uniqueQuery) {
    const posting = index.inverted.get(token);
    if (!posting) continue;
    for (const [docId, tf] of posting) {
      const doc = index.docs.get(docId);
      if (!doc) continue;
      // TF contribution + bonus for matching more distinct query tokens
      const prev = scores.get(docId) || { score: 0, hits: 0 };
      const tfNorm = tf / Math.max(doc.tokenCount, 1);
      scores.set(docId, {
        score: prev.score + tfNorm + 1,
        hits: prev.hits + 1,
      });
    }
  }

  // Prefer docs that cover more of the query; light boost for phrase-ish includes
  const lowerQ = q.toLowerCase();
  const results = [];
  for (const [docId, { score, hits }] of scores) {
    const doc = index.docs.get(docId);
    if (!doc) continue;
    let finalScore = score * (hits / uniqueQuery.length);
    if (doc.text.toLowerCase().includes(lowerQ)) {
      finalScore += 0.5;
    }
    results.push({
      id: doc.id,
      text: doc.text,
      timestamp: doc.timestamp,
      score: finalScore,
    });
  }

  results.sort((a, b) => b.score - a.score || String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  return results;
}

/* ============================================================================
   DATE FILTERING (Phase 1)
   All boundaries computed in the browser's LOCAL timezone. A date-only value
   spans the entire local calendar day: [00:00:00.000, 23:59:59.999].
   ========================================================================== */

/**
 * Parse a `YYYY-MM-DD` string (as produced by <input type="date">) into local
 * calendar parts. Returns null for anything malformed.
 * @param {string} str
 * @returns {{ y: number, m: number, d: number } | null}
 */
export function parseYmdLocal(str) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '').trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** Start-of-day (00:00:00.000) in local time, in ms. Accepts Date | ms | ISO. */
export function startOfDayMs(input) {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(d.getTime())) return NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** End-of-day (23:59:59.999) in local time, in ms. Accepts Date | ms | ISO. */
export function endOfDayMs(input) {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(d.getTime())) return NaN;
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** ms at start of a local day shifted `deltaDays` from `base` (DST-safe). */
function shiftedDayStartMs(base, deltaDays) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays, 0, 0, 0, 0).getTime();
}

/** ms at end of a local day shifted `deltaDays` from `base` (DST-safe). */
function shiftedDayEndMs(base, deltaDays) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays, 23, 59, 59, 999).getTime();
}

/**
 * Resolve a preset key to a { fromMs, toMs } local-time range (inclusive).
 * `now` is injectable for deterministic tests.
 * @param {'today'|'yesterday'|'last7'|'last30'|'thisYear'} preset
 * @param {number} [now]
 * @returns {{ fromMs: number, toMs: number } | null}
 */
export function getPresetRange(preset, now = Date.now()) {
  const base = new Date(now);
  const todayEnd = shiftedDayEndMs(base, 0);
  switch (preset) {
    case 'today':
      return { fromMs: shiftedDayStartMs(base, 0), toMs: todayEnd };
    case 'yesterday':
      return { fromMs: shiftedDayStartMs(base, -1), toMs: shiftedDayEndMs(base, -1) };
    case 'last7':
      // Rolling 7-day window ending today (today + previous 6 days).
      return { fromMs: shiftedDayStartMs(base, -6), toMs: todayEnd };
    case 'last30':
      return { fromMs: shiftedDayStartMs(base, -29), toMs: todayEnd };
    case 'thisYear':
      return { fromMs: new Date(base.getFullYear(), 0, 1, 0, 0, 0, 0).getTime(), toMs: todayEnd };
    default:
      return null;
  }
}

/**
 * Build a { fromMs, toMs } range from UI filter state.
 * - preset (other than 'all'/'custom') → getPresetRange
 * - custom from/to (YYYY-MM-DD) → local day boundaries; a lone bound is open-ended
 *   (`from` only = "on or after", `to` only = "on or before")
 * Returns null when no date constraint is active.
 * @param {{ preset?: string, from?: string, to?: string }} state
 * @param {number} [now]
 * @returns {{ fromMs: number|null, toMs: number|null } | null}
 */
export function resolveDateRange(state, now = Date.now()) {
  if (!state) return null;
  const { preset, from, to } = state;

  if (preset && preset !== 'custom' && preset !== 'all') {
    return getPresetRange(preset, now);
  }

  const fromParts = parseYmdLocal(from);
  const toParts = parseYmdLocal(to);
  if (!fromParts && !toParts) return null;

  let fromMs = fromParts ? new Date(fromParts.y, fromParts.m - 1, fromParts.d, 0, 0, 0, 0).getTime() : null;
  let toMs = toParts ? new Date(toParts.y, toParts.m - 1, toParts.d, 23, 59, 59, 999).getTime() : null;

  // If the user picked From after To, treat it as an (inclusive) range either way
  // rather than silently returning nothing.
  if (fromMs != null && toMs != null && fromMs > toMs) {
    const swap = fromMs;
    fromMs = startOfDayMs(toMs);
    toMs = endOfDayMs(swap);
  }

  return { fromMs, toMs };
}

/**
 * Is `timestampMs` inside the (inclusive) range? A null bound is open-ended.
 * @param {number} timestampMs
 * @param {{ fromMs: number|null, toMs: number|null } | null} range
 * @returns {boolean}
 */
export function matchesDateRange(timestampMs, range) {
  if (!range) return true;
  if (!Number.isFinite(timestampMs)) return false;
  const from = range.fromMs == null ? -Infinity : range.fromMs;
  const to = range.toMs == null ? Infinity : range.toMs;
  return timestampMs >= from && timestampMs <= to;
}

/**
 * Combined search: text query + filters, with AND logic between categories.
 *
 * - No text and no active filters → [] (preserves the original "empty query
 *   shows nothing" behavior).
 * - Text only → existing ranked text search.
 * - Filters only → all messages that satisfy the filters, newest first.
 * - Text + filters → ranked text matches that also satisfy every filter.
 *
 * Additional filter categories (sender, media, documents, links) plug in here
 * in later phases as further AND predicates.
 *
 * @param {{ docs: Map, inverted: Map }} index
 * @param {{ query?: string, dateRange?: ({ fromMs: number|null, toMs: number|null }|null) }} criteria
 * @returns {Array<{ id: string, text: string, timestamp: *, timestampMs: number, hasAttachment: boolean, score: number }>}
 */
export function searchMessages(index, criteria = {}) {
  if (!index?.docs?.size) return [];

  const { query = '', dateRange = null, type = 'all', filename = '', domain = '' } = criteria;
  const q = String(query || '').trim();
  const filenameQuery = String(filename || '').trim().toLowerCase();
  const domainQuery = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const hasText = q.length > 0 && tokenize(q).length > 0;
  const hasDate = Boolean(dateRange) && (dateRange.fromMs != null || dateRange.toMs != null);
  const hasType = type !== 'all';
  const hasFilename = filenameQuery.length > 0;
  const hasDomain = domainQuery.length > 0;

  if (!hasText && !hasDate && !hasType && !hasFilename && !hasDomain) return [];

  let candidates;
  if (hasText) {
    candidates = searchIndex(index, q).map((r) => {
      const doc = index.docs.get(r.id);
      return {
        ...r,
        timestampMs: doc ? doc.timestampMs : NaN,
        hasAttachment: doc ? doc.hasAttachment : false,
        filename: doc ? doc.filename : '',
        isPicture: doc ? doc.isPicture : false,
        isDocument: doc ? doc.isDocument : false,
      };
    });
  } else {
    candidates = [];
    for (const doc of index.docs.values()) {
      candidates.push({
        id: doc.id,
        text: doc.text,
        timestamp: doc.timestamp,
        timestampMs: doc.timestampMs,
        hasAttachment: doc.hasAttachment,
        score: 0,
      });
    }
    candidates.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  }

  return candidates.filter((r) => {
    const doc = index.docs.get(r.id);
    if (!doc) return false;
    if (hasDate && !matchesDateRange(r.timestampMs, dateRange)) return false;
    if (hasFilename && !doc.filename.toLowerCase().includes(filenameQuery)) return false;
    if (hasDomain && !doc.linkDomains.some((item) => item.includes(domainQuery))) return false;
    if (hasType) {
      if (type === 'messages' && doc.hasAttachment) return false;
      if (type === 'pictures' && !doc.isPicture) return false;
      if (type === 'documents' && !doc.isDocument) return false;
      if (type === 'links' && !doc.linkDomains.length) return false;
    }
    return true;
  });
}
