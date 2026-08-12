import { useMemo } from 'react';
import { File as FileIcon, X } from 'lucide-react';

export default function ChatMediaModal({ messages, onImageClick, onClose }) {
  const mediaItems = useMemo(() => {
    return messages
      .filter((m) => m.attachment)
      .map((m) => ({
        id: m.id || m._id,
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
                 src={imageSrcMap?.get(String(item.id))?.src}
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