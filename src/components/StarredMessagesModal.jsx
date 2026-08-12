import { Star, Users, X } from 'lucide-react';
import UserAvatar from './UserAvatar.jsx';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export default function StarredMessagesModal({
  entries,
  usernameById,
  currentUserId,
  onSelect,
  onUnstar,
  onClose,
}) {
  return (
    <div className="create-group-overlay" role="presentation" onClick={onClose}>
      <div
        className="create-group-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="starred-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-group-modal-header">
          <div className="create-group-modal-heading">
            <h2 id="starred-title">Starred messages</h2>
            <p>{entries.length} starred</p>
          </div>
          <button type="button" className="create-group-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="user-list">
          {entries.length === 0 ? (
            <p className="empty-hint">No starred messages yet.</p>
          ) : (
            entries.map((entry) => {
              const senderName =
                String(entry.from) === String(currentUserId)
                  ? 'You'
                  : usernameById.get(String(entry.from)) || 'Member';
              return (
                <div
                  key={entry.id}
                  className="user-list-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(entry);
                    }
                  }}
                >
                  {entry.type === 'group' ? (
                    <span className="avatar group-avatar">
                      <Users size={18} strokeWidth={2} aria-hidden="true" />
                    </span>
                  ) : (
                    <UserAvatar userId={entry.conversationId} name={entry.title} />
                  )}
                  <span className="user-list-meta">
                    <span className="user-list-name-row">
                      <span className="user-list-name">{entry.title}</span>
                      <span className="conv-row-time">{formatWhen(entry.createdAt)}</span>
                    </span>
                    <span className="user-list-lastseen">
                      {senderName}:{' '}
                      {entry.text || (entry.hasAttachment ? `[${entry.attachmentFilename || 'Attachment'}]` : '[encrypted]')}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="user-list-action-btn"
                    title="Remove from starred"
                    aria-label="Unstar message"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnstar(entry.id);
                    }}
                  >
                    <Star size={15} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}