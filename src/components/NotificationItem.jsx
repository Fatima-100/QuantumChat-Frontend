import { useState } from 'react';
import {
  Phone,
  PhoneOff,
  MessageSquare,
  Send,
  Check,
  X,
} from 'lucide-react';
import './NotificationItem.css';

/**
 * NotificationItem
 *
 * Renders a single notification with actions based on its type:
 *  - "call"    -> Pick Up / Decline
 *  - "message" -> inline Reply box
 *  - "unread"  -> Mark as Read
 *
 * notification = {
 *   id, type: 'call' | 'message' | 'unread',
 *   sender: string,
 *   text: string,
 *   avatar?: string,
 *   time?: string,
 * }
 */
export default function NotificationItem({
  notification,
  onPickUp,
  onDecline,
  onReply,
  onMarkRead,
  onDismiss,
}) {
  const { id, type, sender, text, avatar, time } = notification;

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply?.(id, replyText.trim());
    setReplyText('');
    setReplyOpen(false);
  };

  const icon =
    type === 'call' ? (
      <Phone size={20} className="notif-icon notif-icon-call" />
    ) : (
      <MessageSquare size={20} className="notif-icon notif-icon-message" />
    );

  return (
    <div className={`notif-card notif-${type}`}>
      <div className="notif-avatar">
        {avatar ? (
          <img src={avatar} alt={sender} />
        ) : (
          <span>{sender?.[0]?.toUpperCase() || '?'}</span>
        )}
      </div>

      <div className="notif-body">
        <div className="notif-header">
          {icon}
          <span className="notif-sender">{sender}</span>
          {time && <span className="notif-time">{time}</span>}
        </div>

        <p className="notif-text">{text}</p>

        {/* --- Incoming call actions --- */}
        {type === 'call' && (
          <div className="notif-actions">
            <button
              className="notif-btn notif-btn-accept"
              onClick={() => onPickUp?.(id)}
            >
              <Phone size={16} />
              Pick Up
            </button>
            <button
              className="notif-btn notif-btn-decline"
              onClick={() => onDecline?.(id)}
            >
              <PhoneOff size={16} />
              Decline
            </button>
          </div>
        )}

        {/* --- New message actions --- */}
        {type === 'message' && (
          <>
            {!replyOpen ? (
              <div className="notif-actions">
                <button
                  className="notif-btn notif-btn-reply"
                  onClick={() => setReplyOpen(true)}
                >
                  <Send size={16} />
                  Reply
                </button>
              </div>
            ) : (
              <div className="notif-reply-box">
                <input
                  autoFocus
                  type="text"
                  placeholder="Type a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                />
                <button
                  className="notif-btn notif-btn-send"
                  onClick={handleSendReply}
                >
                  <Send size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* --- Unread message actions --- */}
        {type === 'unread' && (
          <div className="notif-actions">
            <button
              className="notif-btn notif-btn-read"
              onClick={() => onMarkRead?.(id)}
            >
              <Check size={16} />
              Mark as Read
            </button>
          </div>
        )}
      </div>

      <button
        className="notif-dismiss"
        onClick={() => onDismiss?.(id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}
