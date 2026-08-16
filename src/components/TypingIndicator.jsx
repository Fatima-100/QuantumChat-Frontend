/**
 * TypingIndicator — three bouncing dots shown while the peer is typing.
 */
function TypingIndicator({ isTyping, username }) {
  if (!isTyping) return null;

  return (
    <div
      className="typing-indicator"
      role="status"
      aria-label={username ? `${username} is typing` : 'Someone is typing'}
    >
      {username ? (
        <span className="typing-indicator-text">{username} is typing</span>
      ) : null}
      <span className="typing-dots" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
    </div>
  );
}

export default TypingIndicator;
