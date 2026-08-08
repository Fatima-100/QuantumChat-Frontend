import { playReceiveSound, unlockAudio } from './sounds.js';

/** Returns true if the current time falls inside the configured DND window (handles overnight ranges). */
function isWithinDoNotDisturb(dnd) {
  if (!dnd?.enabled) return false;
  const [startH, startM] = (dnd.startTime || '22:00').split(':').map(Number);
  const [endH, endM] = (dnd.endTime || '07:00').split(':').map(Number);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes === endMinutes) return true; // 24h DND if start === end
  if (startMinutes < endMinutes) {
    // Same-day window, e.g. 09:00 -> 17:00
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Overnight window, e.g. 22:00 -> 07:00
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/**
 * Decide whether an incoming message/event should notify the user, given their
 * notification settings. Centralizes DND, per-type toggles, and priority so
 * every call site (socket handlers, push, etc.) applies the same rules.
 *
 * kind: 'dm' | 'group' | 'status' | 'call'
 */
export function shouldNotify(notifSettings, { kind, isMention = false } = {}) {
  if (!notifSettings) return true; // fail-open before settings load
  if (isWithinDoNotDisturb(notifSettings.doNotDisturb)) return false;
  if (notifSettings.priority === 'silent') return false;

  if (kind === 'group') {
    const mode = notifSettings.groupNotifications;
    if (mode === 'off') return false;
    if (mode === 'mentions_only' && !isMention) return false;
    if (mode === 'important_only' && !isMention) return false; // "important" = announcements/mentions for now
    return true;
  }

  if (kind === 'dm') {
    const mode = notifSettings.messageNotifications;
    if (mode === 'off') return false;
    return true; // 'all', 'direct_only', 'all_except_reactions' all permit DMs
  }

  if (kind === 'status') {
    return notifSettings.statusNotifications !== 'off';
  }

  if (kind === 'call') {
    return true; // per-type (voice/video) enable check + DND/priority already handled above
  }

  return true;
}

/** Plays the notification sound if enabled, scaled by the configured volume. */
export function playNotificationSound(notifSettings) {
  if (notifSettings?.soundEnabled === false) return;
  unlockAudio();
  const scale =
    typeof notifSettings?.soundVolume === 'number' ? notifSettings.soundVolume / 100 : 1;
  playReceiveSound(scale);
}

/** Builds the { title, body } text for a popup, respecting the messagePreview setting. */
export function buildNotificationText(
  { senderName, messageText, isGroup, groupName },
  notifSettings,
) {
  const preview = notifSettings?.messagePreview || 'full';

  if (preview === 'hidden') {
    return { title: 'QuantumChat', body: 'New message' };
  }
  if (preview === 'sender_only') {
    return {
      title: isGroup ? groupName || 'QuantumChat' : senderName || 'QuantumChat',
      body: isGroup && senderName ? `${senderName} sent a message` : 'New message',
    };
  }
  // 'full'
  const body = messageText?.trim() ? messageText : '[Attachment]';
  return {
    title: isGroup ? groupName || 'QuantumChat' : senderName || 'QuantumChat',
    body: isGroup && senderName ? `${senderName}: ${body}` : body,
  };
}

/**
 * Shows a real browser Notification popup, if permission is already granted.
 * When the tab is hidden, prefer OS sound (silent:false) because Web Audio is
 * often suspended in background tabs.
 */
export function showNotificationPopup(
  { title, body, requireInteraction, icon, tag },
  notifSettings,
  onClick,
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (notifSettings?.webNotifications?.enabled === false) return;

  const tabHidden =
    typeof document !== 'undefined' && document.visibilityState === 'hidden';
  const soundOnWeb = notifSettings?.webNotifications?.soundOnWeb !== false;
  const allowOsSound = soundOnWeb && notifSettings?.soundEnabled !== false;
  const silent = tabHidden ? !allowOsSound : true;

  try {
    const n = new Notification(title, {
      body,
      icon: icon || '/logo.png',
      badge: '/logo.png',
      silent,
      requireInteraction: requireInteraction ?? notifSettings?.priority === 'high',
      tag: tag || 'quantumchat-alert',
      renotify: true,
    });
    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
  } catch {
    // ignore unsupported/blocked notifications
  }
}
/** Builds { title, body } for multiple buffered messages in one conversation, WhatsApp-style. */
export function buildGroupedNotificationText(entries, { isGroup, groupName, notifSettings }) {
  const preview = notifSettings?.messagePreview || 'full';
  const title = isGroup ? groupName || 'QuantumChat' : entries[0]?.senderName || 'QuantumChat';

  if (preview === 'hidden') {
    return { title, body: entries.length > 1 ? `${entries.length} new messages` : 'New message' };
  }

  if (entries.length === 1) {
    const e = entries[0];
    const text = preview === 'sender_only' ? 'New message' : (e.text?.trim() || '[Attachment]');
    return { title, body: isGroup && e.senderName ? `${e.senderName}: ${text}` : text };
  }

  // Multiple buffered messages — show last 2 lines + a "+N more" summary, like WhatsApp.
  if (preview === 'sender_only') {
    return { title, body: `${entries.length} new messages` };
  }
  const lines = entries.slice(-2).map((e) => {
    const text = e.text?.trim() || '[Attachment]';
    return isGroup && e.senderName ? `${e.senderName}: ${text}` : text;
  });
  const extra = entries.length - lines.length;
  const body = extra > 0 ? `${lines.join('\n')}\n+${extra} more` : lines.join('\n');
  return { title, body };
}