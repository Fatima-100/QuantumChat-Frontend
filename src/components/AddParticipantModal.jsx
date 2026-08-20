import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, UserPlus, X } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap.js';

export default function AddParticipantModal({
  users = [],
  currentParticipantIds = [],
  onClose,
  onAddParticipant,
}) {
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef(null);

  useFocusTrap(containerRef, true, { onEscape: () => !submitting && onClose?.() });

  const activeIdsSet = useMemo(
    () => new Set((currentParticipantIds || []).map((id) => String(id))),
    [currentParticipantIds]
  );

  const availableUsers = useMemo(() => {
    const people = Array.isArray(users) ? users : [];
    return people.filter((u) => !activeIdsSet.has(String(u.id || u._id)));
  }, [users, activeIdsSet]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableUsers;
    return availableUsers.filter(
      (u) =>
        (u.displayName || u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [availableUsers, search]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e) {
      if (e.key === 'Escape' && !submitting) onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, submitting]);

  async function handleSelect(user) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onAddParticipant?.(user);
      onClose?.();
    } catch {
      /* handled by caller toast */
    } finally {
      setSubmitting(false);
    }
  }

  const modal = (
    <div
      className="create-group-overlay"
      role="presentation"
      onClick={() => !submitting && onClose?.()}
    >
      <div
        className="create-group-modal"
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-participant-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-group-modal-header">
          <div className="create-group-modal-icon" aria-hidden="true">
            <UserPlus size={20} />
          </div>
          <div className="create-group-modal-heading">
            <h2 id="add-participant-title">Add participant</h2>
            <p>Select a contact to invite to the call.</p>
          </div>
          <button
            type="button"
            className="create-group-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="create-group-body">
          <div className="create-group-field">
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={16} />
              <input
                type="text"
                className="create-group-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts…"
                autoFocus
                disabled={submitting}
              />
            </div>
          </div>

          <div className="member-picker" role="listbox" aria-label="Select participant">
            {filtered.map((u) => {
              const id = String(u.id || u._id);
              const name = u.displayName || u.username || 'User';
              return (
                <button
                  type="button"
                  key={id}
                  className="member-picker-item"
                  role="option"
                  onClick={() => handleSelect(u)}
                  disabled={submitting}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none' }}
                >
                  <span className="avatar tiny">{(name || '?').slice(0, 2).toUpperCase()}</span>
                  <span className="member-picker-meta">
                    <span className="member-picker-name">{name}</span>
                    {u.username && u.displayName && (
                      <span className="member-picker-email">@{u.username}</span>
                    )}
                  </span>
                  <UserPlus size={16} className="member-check" />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="empty-hint member-picker-empty">
                {availableUsers.length === 0
                  ? 'No eligible contacts available to add.'
                  : 'No matching contacts found.'}
              </p>
            )}
          </div>
        </div>

        <div className="create-group-actions">
          <button
            type="button"
            className="confirm-btn cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
