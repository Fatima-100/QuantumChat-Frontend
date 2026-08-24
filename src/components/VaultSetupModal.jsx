import { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { useVault } from '../context/VaultContext.jsx';

/**
 * First-time vault setup: explains what the vault does (and its real
 * limits) before letting the person set a password. Shown once, before
 * the first "Add to Vault" action can proceed.
 */
export default function VaultSetupModal({ onClose, onCreated }) {
  const { setPassword } = useVault();
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Vault password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!agreed) {
      setError('Please confirm you understand how the vault works');
      return;
    }
    setBusy(true);
    try {
      await setPassword({ password });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not set vault password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="create-group-overlay" onClick={onClose}>
      <form
        className="create-group-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="create-group-modal-header">
          <div className="create-group-modal-icon">
            <Lock size={20} />
          </div>
          <div className="create-group-modal-heading">
            <h2>Set up your vault</h2>
            <p>A password-protected space for chats you want kept separate</p>
          </div>
          <button type="button" className="create-group-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="create-group-body">
          <div
            className="settings-notice"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              fontSize: '13px',
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
              <ShieldCheck size={16} /> How the vault works
            </strong>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Chats you add to the vault disappear from your chat list, search, and Friends tab while locked.</li>
              <li>Opening a vaulted contact while locked shows an empty decoy conversation — not your real history.</li>
              <li>Anything sent while locked stays in that decoy thread and never mixes with your real messages.</li>
              <li>Unlock with your vault password to see the real conversation again.</li>
              <li>This password is separate from your login password. If you forget it, vaulted chats cannot be recovered without it.</li>
              <li>The other person in the chat is not affected — they always see their normal conversation with you.</li>
            </ul>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <label className="create-group-field">
            <span className="create-group-label">Vault password</span>
            <input
              type="password"
              className="create-group-input"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder="At least 6 characters"
              autoFocus
              autoComplete="new-password"
            />
          </label>

          <label className="create-group-field">
            <span className="create-group-label">Confirm password</span>
            <input
              type="password"
              className="create-group-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: '2px', accentColor: 'var(--accent)' }}
            />
            <span>
              I understand how the vault works, including that forgetting this
              password means vaulted chats can&apos;t be recovered.
            </span>
          </label>
        </div>

        <div className="create-group-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="confirm-btn" disabled={busy || !agreed}>
            {busy ? 'Setting up…' : 'Agree & continue'}
          </button>
        </div>
      </form>
    </div>
  );
}