import { useMemo } from 'react';
import { File as FileIcon, X } from 'lucide-react';
import { attachmentIdOf } from '../../crypto/voiceCache.js';
export default function ChatMediaModal({ messages, imageSrcMap, onImageClick, onClose }) {
  const mediaItems = useMemo(() => {
    return messages
      .filter((m) => m.attachment && attachmentIdOf(m.attachment))
      .map((m) => ({
        id: attachmentIdOf(m.attachment),
        attachment: m.attachment,
        isImage: (m.attachment?.mimetype || '').startsWith('image/'),
      }))
      .reverse();
  }, [messages]);

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

        {mediaItems.length === 0 ? (
          <p className="empty-hint">No media shared in this chat yet.</p>
        ) : (
          <div className="chat-media-grid">
           {mediaItems.map((item) =>
  item.isImage ? (
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
  ) : (
                <div key={item.id} className="chat-media-file-chip">
                  <FileIcon size={16} strokeWidth={2} />
                  <span>{item.attachment.filename || 'File'}</span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}