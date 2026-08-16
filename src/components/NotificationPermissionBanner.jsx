import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { enablePushNotifications, getNotificationPermission } from '../utils/pushNotifications.js';
import { unlockAudio } from '../utils/sounds.js';
import './NotificationPermissionBanner.css';

/**
 * Soft prompt so users can enable OS notifications (with sound) when using other apps.
 * Hidden once permission is granted/denied or the user dismisses for this session.
 */
export default function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (sessionStorage.getItem('qc-notif-banner-dismissed') === '1') return;
    if (getNotificationPermission() === 'default') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  async function enable() {
    setBusy(true);
    setError('');
    unlockAudio();
    const res = await enablePushNotifications();
    setBusy(false);
    if (res.ok && res.permission === 'granted') {
      setVisible(false);
      return;
    }
    if (res.permission === 'denied') {
      setError(res.error || 'Blocked by the browser. Allow notifications in site settings.');
      return;
    }
    setError(res.error || 'Could not enable notifications');
  }

  function dismiss() {
    sessionStorage.setItem('qc-notif-banner-dismissed', '1');
    setVisible(false);
  }

  return (
    <div className="notif-perm-banner" role="status">
      <div className="notif-perm-banner-icon" aria-hidden="true">
        <Bell size={18} />
      </div>
      <div className="notif-perm-banner-copy">
        <strong>Stay notified</strong>
        <span>
          Allow notifications so QuantumChat can alert you with sound when you get messages while
          using other apps.
        </span>
        {error ? <span className="notif-perm-banner-error">{error}</span> : null}
      </div>
      <div className="notif-perm-banner-actions">
        <button type="button" className="notif-perm-btn primary" disabled={busy} onClick={enable}>
          {busy ? 'Enabling…' : 'Enable'}
        </button>
        <button
          type="button"
          className="notif-perm-btn ghost"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
