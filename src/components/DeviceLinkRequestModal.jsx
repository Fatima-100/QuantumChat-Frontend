import { useEffect, useMemo } from 'react';

function parseDeviceMeta(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase();
  let browser = 'Browser';
  let os = 'Unknown';

  if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opr') || ua.includes('opera')) browser = 'Opera';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { browser, os };
}

export default function DeviceLinkRequestModal({ open, request, busy, onApprove, onReject, onClose }) {
  const meta = useMemo(() => parseDeviceMeta(request?.userAgent || ''), [request?.userAgent]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isPreparing = busy && !request;

  return (
    <div className="confirm-overlay" role="presentation" onClick={() => !busy && onClose?.()}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-link-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M8 9h8" />
            <path d="M8 13h5" />
          </svg>
        </div>
        <h2 id="device-link-title" className="confirm-dialog-title confirm-title">
          {isPreparing ? 'Preparing device link' : 'New device wants to connect'}
        </h2>
        <p className="confirm-dialog-message confirm-message">
          {isPreparing
            ? 'Creating the pairing request. This will open as soon as the backend responds.'
            : 'Approve this connection to let the device access your account.'}
        </p>
        {!isPreparing ? (
          <div className="settings-fieldset" style={{ marginTop: 12, padding: 12 }}>
            <div className="settings-row" style={{ cursor: 'default', padding: 0 }}>
              <span className="settings-row-left">
                <span className="settings-row-label">Device</span>
                <span className="settings-row-hint">{request?.deviceLabel || 'Unknown device'}</span>
              </span>
            </div>
            <div className="settings-row" style={{ cursor: 'default', padding: 0 }}>
              <span className="settings-row-left">
                <span className="settings-row-label">Browser</span>
                <span className="settings-row-hint">{meta.browser}</span>
              </span>
            </div>
            <div className="settings-row" style={{ cursor: 'default', padding: 0 }}>
              <span className="settings-row-left">
                <span className="settings-row-label">OS</span>
                <span className="settings-row-hint">{meta.os}</span>
              </span>
            </div>
          </div>
        ) : null}
        <div className="confirm-dialog-actions confirm-actions">
          <button type="button" className="confirm-btn-cancel confirm-btn cancel" onClick={onReject} disabled={busy || isPreparing}>
            {busy && !isPreparing ? 'Working…' : 'Reject'}
          </button>
          <button type="button" className="confirm-btn confirm-btn-confirm primary" onClick={onApprove} disabled={busy || isPreparing}>
            {busy && !isPreparing ? 'Working…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
