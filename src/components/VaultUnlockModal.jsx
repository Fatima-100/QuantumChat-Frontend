import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { useVault } from '../context/VaultContext.jsx';

/**
 * Password prompt to unlock the vault for this browser session. Unlock
 * state lives in memory only (api/vaultToken.js) — closing the tab or
 * reloading re-locks automatically.
 */
export default function VaultUnlockModal({ onClose, onUnlocked }) {
  const { unlock } = useVault();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setError('');
    setBusy(true);
    try {
      await unlock(password);
      onUnlocked?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Incorrect vault password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="create-group-overlay" onClick={onClose}>
      <form
        className="create-group-modal"
        style={{ height: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="create-group-modal-header">
          <div className="create-group-modal-icon">
            <Lock size={20} />
          </div>
          <div className="create-group-modal-heading">
            <h2>Unlock vault</h2>
            <p>Enter your vault password to view real conversations</p>
          </div>
          <button type="button" className="create-group-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="create-group-body">
          {error && <div className="auth-error">{error}</div>}
          <label className="create-group-field">
            <span className="create-group-label">Vault password</span>
            <input
              type="password"
              className="create-group-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your vault password"
              autoFocus
              autoComplete="current-password"
            />
          </label>
        </div>

        <div className="create-group-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="confirm-btn" disabled={busy || !password}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  );
}