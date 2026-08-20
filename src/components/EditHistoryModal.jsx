import { X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { unsealMessage } from '../crypto/keys.js';

// This modal always renders a light card, regardless of the app's active
// theme — so it must NOT read global theme vars like --text-primary or
// --modal-bg. On a dark theme those vars are set for light-on-dark text
// and silently produce light-gray-on-white here. Hardcode instead.
const MUTED_COLOR = '#8b8b8b';
const TEXT_PRIMARY = '#1a1a1a';
const TRACK_COLOR = 'rgba(0,0,0,0.08)';
const CARD_BG = '#ffffff';
const ACCENT = '#53bdeb';

function formatTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  // Relative time for "today"-scale edits, absolute otherwise.
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24 && d.toDateString() === now.toDateString()) return `${diffHrs}h ago`;

  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EditHistoryModal({ message, currentUserId, resolveSecretKey, onClose }) {
  const closeButtonRef = useRef(null);

  const versions = useMemo(() => {
    if (!message) return [];
    const isMine = String(message.from) === String(currentUserId);
    const history = (message.editHistory || []).map((h) => {
      let text = null;
      let decryptFailed = false;

      if (message.group) {
        if (typeof h.content === 'string') {
          text = h.content;
        } else if (Array.isArray(h.envelopes)) {
          const mine = h.envelopes.find((e) => String(e.user) === String(currentUserId));
          if (mine?.targetPublicKey) {
            const sk = resolveSecretKey(mine.targetPublicKey);
            if (sk) {
              text = unsealMessage(mine, sk);
              if (text == null) decryptFailed = true;
            } else {
              decryptFailed = true;
            }
          } else {
            decryptFailed = true;
          }
        }
      } else {
        const envelope = isMine ? h.forSender : h.forRecipient;
        if (envelope?.targetPublicKey) {
          const sk = resolveSecretKey(envelope.targetPublicKey);
          if (sk) {
            text = unsealMessage(envelope, sk);
            if (text == null) decryptFailed = true;
          } else {
            decryptFailed = true;
          }
        } else {
          decryptFailed = true;
        }
      }
      return { text, editedAt: h.editedAt, decryptFailed };
    });

    // Current (latest) version goes last in storage order, but we want
    // newest-first display, with "Current" pinned at top.
    return [
      { text: message.text, editedAt: message.editedAt, isCurrent: true },
      ...history.slice().reverse(),
    ];
  }, [message, currentUserId, resolveSecretKey]);

  // Close on Escape, and return focus to the close button on open.
  useEffect(() => {
    if (!message) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener('keydown', handleKey);
  }, [message, onClose]);

  if (!message) return null;

  // Only the earlier edits count toward "was this ever edited" —
  // the current version is always present, so it can't drive the empty state.
  const hasEditHistory = versions.length > 1;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-history-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: CARD_BG,
          borderRadius: 16,
          width: '100%',
          maxWidth: 380,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderBottom: `1px solid ${TRACK_COLOR}`,
            flexShrink: 0,
          }}
        >
          <h2
            id="edit-history-title"
            style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT_PRIMARY }}
          >
            Edit history
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: TEXT_PRIMARY,
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 18px 22px', overflowY: 'auto' }}>
          {!hasEditHistory && (
            <div style={{ fontSize: 13, color: MUTED_COLOR, marginBottom: 8 }}>
              This message hasn&apos;t been edited.
            </div>
          )}
          {versions.map((v, i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: v.isCurrent ? 'rgba(83, 189, 235, 0.08)' : 'rgba(0,0,0,0.03)',
                border: v.isCurrent ? `1px solid rgba(83, 189, 235, 0.3)` : 'none',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: v.isCurrent ? ACCENT : MUTED_COLOR,
                  marginBottom: 4,
                }}
              >
                {v.isCurrent ? 'Current' : formatTimestamp(v.editedAt) || 'Earlier version'}
              </div>
              <div style={{ fontSize: 14, color: TEXT_PRIMARY, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {v.text != null ? (
                  v.text
                ) : v.decryptFailed ? (
                  <em style={{ color: MUTED_COLOR }}>[Unable to decrypt]</em>
                ) : (
                  <em style={{ color: MUTED_COLOR }}>[No content]</em>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}