import { Check, CheckCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import client from '../api/client.js';
import UserAvatar from './UserAvatar.jsx';

function formatTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const READ_COLOR = '#53bdeb';
const MUTED_COLOR = '#8b8b8b';
const TRACK_COLOR = 'rgba(0,0,0,0.08)';
const CARD_BG = 'var(--modal-bg, #fff)';
const TEXT_PRIMARY = 'var(--text-primary, #1a1a1a)';

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: MUTED_COLOR,
        margin: '20px 0 10px',
      }}
    >
      {children}
    </div>
  );
}

function ProgressBar({ fraction, color }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: TRACK_COLOR, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${Math.round(fraction * 100)}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}

function StatusRow({ label, at, isLast }) {
  const formatted = formatTimestamp(at);
  const done = Boolean(at);

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: done ? 'rgba(83, 189, 235, 0.14)' : 'rgba(0,0,0,0.05)',
            color: done ? READ_COLOR : MUTED_COLOR,
            flexShrink: 0,
          }}
        >
          {done ? <CheckCheck size={16} strokeWidth={2.5} /> : <Check size={16} strokeWidth={2.5} />}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 20, background: TRACK_COLOR, marginTop: 2, marginBottom: 2 }} />
        )}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 18, paddingTop: 4 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: TEXT_PRIMARY }}>{label}</div>
        <div style={{ fontSize: 13, color: done ? MUTED_COLOR : 'rgba(139,139,139,0.6)', marginTop: 2 }}>
          {formatted || 'Not yet'}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member }) {
  const status = member.readAt
    ? { label: `Read ${formatTimestamp(member.readAt)}`, color: READ_COLOR, Icon: CheckCheck }
    : member.deliveredAt
    ? { label: `Delivered ${formatTimestamp(member.deliveredAt)}`, color: MUTED_COLOR, Icon: CheckCheck }
    : { label: 'Not delivered yet', color: 'rgba(139,139,139,0.55)', Icon: Check };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 2px' }}>
      <UserAvatar userId={member.userId} name={member.username} hasAvatar={member.hasAvatar} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: TEXT_PRIMARY,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {member.username}
        </div>
        <div style={{ fontSize: 12.5, color: status.color, marginTop: 1 }}>{status.label}</div>
      </div>
      <status.Icon size={16} strokeWidth={2.5} color={status.color} style={{ flexShrink: 0 }} />
    </div>
  );
}

function ReactionRow({ emoji, names }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        background: 'rgba(0,0,0,0.03)',
        marginBottom: 6,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 13.5, color: TEXT_PRIMARY }}>{names.join(', ')}</span>
    </div>
  );
}

function ReplyRow({ reply, senderName, isMine, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'rgba(0,0,0,0.03)',
        border: 'none',
        borderLeft: `3px solid ${READ_COLOR}`,
        borderRadius: '4px 10px 10px 4px',
        padding: '9px 12px',
        marginBottom: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: READ_COLOR, marginBottom: 2 }}>
        {isMine ? 'You' : senderName || 'Someone'}
      </div>
      <div
        style={{
          fontSize: 13.5,
          color: TEXT_PRIMARY,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {reply.text || '[attachment]'}
      </div>
    </button>
  );
}

export default function MessageInfoModal({ data, usernameById, currentUserId, onClose, onSelectReply }) {
  const messageId = data?.id;
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!messageId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    client
      .get(`/messages/${messageId}/info`)
      .then((res) => {
        if (!cancelled) setDelivery(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load message info');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  const groupedReactions = useMemo(() => {
    const map = new Map();
    for (const r of data?.reactions || []) {
      if (!r?.emoji) continue;
      const isMine = String(r.user) === String(currentUserId);
      const name = isMine ? 'You' : usernameById?.get(String(r.user)) || 'Someone';
      const entry = map.get(r.emoji) || { emoji: r.emoji, names: [] };
      entry.names.push(name);
      map.set(r.emoji, entry);
    }
    return [...map.values()];
  }, [data?.reactions, usernameById, currentUserId]);

  const replies = data?.replies || [];
  const sortedMembers = useMemo(() => {
    if (!delivery?.isGroup) return [];
    return delivery.members.slice().sort((a, b) => {
      const rank = (m) => (m.readAt ? 2 : m.deliveredAt ? 1 : 0);
      return rank(b) - rank(a);
    });
  }, [delivery]);

  if (!messageId) return null;

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
        {/* Header */}
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
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT_PRIMARY }}>Message info</h2>
          <button
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

        {/* Body */}
        <div style={{ padding: '16px 18px 22px', overflowY: 'auto' }}>
          {loading && <div style={{ fontSize: 14, color: MUTED_COLOR, padding: '8px 0' }}>Loading…</div>}
          {error && <div style={{ fontSize: 14, color: '#e53e3e', padding: '8px 0' }}>{error}</div>}

          {!loading && !error && delivery && !delivery.isGroup && (
            <div>
              <StatusRow label="Delivered" at={delivery.deliveredAt} />
              <StatusRow label="Read" at={delivery.readAt} isLast />
            </div>
          )}

          {!loading && !error && delivery && delivery.isGroup && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>Delivered</span>
                    <span style={{ color: MUTED_COLOR }}>
                      {delivery.deliveredCount} of {delivery.totalRecipients}
                    </span>
                  </div>
                  <ProgressBar
                    fraction={delivery.totalRecipients ? delivery.deliveredCount / delivery.totalRecipients : 0}
                    color={MUTED_COLOR}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>Read</span>
                    <span style={{ color: MUTED_COLOR }}>
                      {delivery.readCount} of {delivery.totalRecipients}
                    </span>
                  </div>
                  <ProgressBar
                    fraction={delivery.totalRecipients ? delivery.readCount / delivery.totalRecipients : 0}
                    color={READ_COLOR}
                  />
                </div>
              </div>

              <SectionLabel>Members</SectionLabel>
              {sortedMembers.length === 0 ? (
                <div style={{ fontSize: 14, color: MUTED_COLOR, padding: '8px 0' }}>
                  No other members in this group.
                </div>
              ) : (
                sortedMembers.map((m) => <MemberRow key={m.userId} member={m} />)
              )}
            </div>
          )}

          {groupedReactions.length > 0 && (
            <>
              <SectionLabel>Reactions</SectionLabel>
              {groupedReactions.map((g) => (
                <ReactionRow key={g.emoji} emoji={g.emoji} names={g.names} />
              ))}
            </>
          )}

          {replies.length > 0 && (
            <>
              <SectionLabel>Replies</SectionLabel>
              {replies.map((r) => (
                <ReplyRow
                  key={r.id}
                  reply={r}
                  isMine={String(r.from) === String(currentUserId)}
                  senderName={usernameById?.get(String(r.from))}
                  onClick={() => onSelectReply?.(r.id)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}