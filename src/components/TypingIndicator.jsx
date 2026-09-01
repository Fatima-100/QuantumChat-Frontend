/**
 * TypingIndicator — three bouncing dots shown while the peer is typing.
 */
function TypingIndicator({ isTyping, username, usernames = [] }) {
  const names = usernames.filter(Boolean);
  const label = names.length
    ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} typing`
    : username
      ? `${username} is typing`
      : "Someone is typing";

  if (!isTyping && names.length === 0) return null;

  return (
    <div
      className="typing-indicator"
      role="status"
      aria-label={label}
    >
      {names.length ? (
        <span className="typing-indicator-text">{label}</span>
      ) : username ? (
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
