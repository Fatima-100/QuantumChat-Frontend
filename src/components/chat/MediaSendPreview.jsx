import { useEffect, useRef } from 'react';
import { Eye, Send, X } from 'lucide-react';
import useFocusTrap from '../../hooks/useFocusTrap.js';

/**
 * WhatsApp-style preview before sending a photo or video — choose normal or view once.
 */
export default function MediaSendPreview({
  open,
  file,
  index = 0,
  total = 1,
  viewOnce = false,
  onToggleViewOnce,
  onSend,
  onClose,
  sending = false,
}) {
  const containerRef = useRef(null);
  const imagePreviewRef = useRef(null);
  const videoPreviewRef = useRef(null);

  useFocusTrap(containerRef, open);

  useEffect(() => {
    if (!open || !file) return undefined;

    const objectUrl = URL.createObjectURL(file);
    let safePreviewUrl = '';
    try {
      const parsed = new URL(objectUrl);
      if (parsed.protocol === 'blob:') safePreviewUrl = parsed.href;
    } catch {
      // Leave media sources unset for malformed preview URLs.
    }

    const previewElement = file.type.startsWith('video/')
      ? videoPreviewRef.current
      : imagePreviewRef.current;

    if (previewElement) {
      if (safePreviewUrl) previewElement.src = safePreviewUrl;
      else previewElement.removeAttribute('src');
    }

    return () => {
      if (previewElement) previewElement.removeAttribute('src');
      URL.revokeObjectURL(objectUrl);
    };
  }, [open, file]);

  if (!open || !file) return null;

  const mime = String(file.type || '').toLowerCase();
  const isVideo = mime.startsWith('video/');

  return (
    <div className="media-send-overlay" role="dialog" aria-modal="true" aria-label="Send media">
      <div className="media-send-panel" ref={containerRef}>
        <header className="media-send-header">
          <button
            type="button"
            className="composer-context-close"
            onClick={onClose}
            aria-label="Cancel"
            disabled={sending}
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          {total > 1 ? (
            <span className="media-send-counter">
              {index + 1} of {total}
            </span>
          ) : (
            <span className="media-send-title">Send {isVideo ? 'video' : 'photo'}</span>
          )}
          <span className="media-send-header-spacer" aria-hidden="true" />
        </header>

        <div className="media-send-preview">
          {isVideo ? (
            <video
              ref={videoPreviewRef}
              className="media-send-media"
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img ref={imagePreviewRef} alt="" className="media-send-media" />
          )}
        </div>

        <footer className="media-send-footer">
          <button
            type="button"
            className={`media-send-view-once${viewOnce ? ' is-active' : ''}`}
            onClick={() => onToggleViewOnce?.()}
            aria-pressed={viewOnce}
            aria-label={viewOnce ? 'View once enabled' : 'Send as view once'}
            disabled={sending}
            title={viewOnce ? 'View once — tap to send normally' : 'Send as view once'}
          >
            <Eye size={20} strokeWidth={2} aria-hidden="true" />
            <span className="media-send-view-once-label">1</span>
          </button>

          <button
            type="button"
            className="media-send-submit"
            onClick={() => onSend?.()}
            aria-label={viewOnce ? 'Send view once' : 'Send'}
            disabled={sending}
          >
            <Send size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </footer>

        <p className="media-send-hint">
          {viewOnce
            ? 'Recipient can open this once — then it disappears'
            : 'End-to-end encrypted before upload'}
        </p>
      </div>
    </div>
  );
}
