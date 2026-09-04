import { useMemo, useState } from 'react';
import { File as FileIcon, Play, X } from 'lucide-react';
import { attachmentIdOf } from '../../crypto/voiceCache.js';

function classify(mimetype) {
  const mime = String(mimetype || '');
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'image', label: 'Photos' },
  { key: 'video', label: 'Videos' },
  { key: 'file', label: 'Files' },
];

export default function ChatMediaModal({ messages, imageSrcMap, onImageClick, onClose }) {
  const [activeTab, setActiveTab] = useState('all');

  const mediaItems = useMemo(() => {
    return messages
      .filter((m) => m.attachment && attachmentIdOf(m.attachment))
      .map((m) => ({
        id: attachmentIdOf(m.attachment),
        attachment: m.attachment,
        kind: classify(m.attachment?.mimetype),
      }))
      .reverse();
  }, [messages]);

  const counts = useMemo(() => {
    const c = { image: 0, video: 0, file: 0 };
    for (const item of mediaItems) c[item.kind] += 1;
    return c;
  }, [mediaItems]);

  const visibleItems = useMemo(
    () => (activeTab === 'all' ? mediaItems : mediaItems.filter((item) => item.kind === activeTab)),
    [mediaItems, activeTab],
  );

  return (
    <div className="create-group-overlay" role="presentation" onClick={onClose}>
      <div
        className="create-group-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-media-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-group-modal-header">
          <div className="create-group-modal-heading">
            <h2 id="chat-media-title">Chat media</h2>
            <p>{mediaItems.length} shared file{mediaItems.length === 1 ? '' : 's'}</p>
          </div>
          <button type="button" className="create-group-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Media type"
          style={{ display: 'flex', gap: 6, padding: '0 4px 12px', flexWrap: 'wrap' }}
        >
          {TABS.map((tab) => {
            const count = tab.key === 'all' ? mediaItems.length : counts[tab.key];
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                disabled={tab.key !== 'all' && count === 0}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border-color, rgba(0,0,0,0.12))',
                  background: active ? 'var(--accent, #7c3aed)' : 'transparent',
                  color: active ? '#fff' : 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: tab.key !== 'all' && count === 0 ? 'not-allowed' : 'pointer',
                  opacity: tab.key !== 'all' && count === 0 ? 0.45 : 1,
                }}
              >
                {tab.label}
                {tab.key !== 'all' ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        {visibleItems.length === 0 ? (
          <p className="empty-hint">
            {mediaItems.length === 0 ? 'No media shared in this chat yet.' : 'Nothing in this tab yet.'}
          </p>
        ) : (
          <div className="chat-media-grid">
            {visibleItems.map((item) => {
              if (item.kind === 'image') {
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="chat-media-thumb"
                    onClick={() => onImageClick?.(item.id)}
                    aria-label="Open image"
                  >
                    <img
                      src={imageSrcMap?.get(String(item.id))?.src}
                      alt={imageSrcMap?.get(String(item.id))?.alt || 'Shared image'}
                      loading="lazy"
                    />
                  </button>
                );
              }

              if (item.kind === 'video') {
                return (
                  <div
                    key={item.id}
                    className="chat-media-thumb"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: 'var(--surface-2, #1a1a1a)',
                      color: 'var(--text-secondary, #ccc)',
                      padding: 8,
                      textAlign: 'center',
                    }}
                    title={item.attachment.filename || 'Video'}
                  >
                    <Play size={22} strokeWidth={2} />
                    <span style={{ fontSize: 11, wordBreak: 'break-all', lineHeight: 1.3 }}>
                      {item.attachment.filename || 'Video'}
                    </span>
                  </div>
                );
              }

              return (
                <div key={item.id} className="chat-media-file-chip">
                  <FileIcon size={16} strokeWidth={2} />
                  <span>{item.attachment.filename || 'File'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}