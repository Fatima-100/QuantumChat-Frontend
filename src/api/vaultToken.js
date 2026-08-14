// In-memory-only holder for the vault unlock token. Deliberately NOT persisted
// anywhere (no localStorage/sessionStorage) — this module-level variable is
// reset to null on every page load/reload/tab close, which is what forces
// re-locking. React state (VaultContext) mirrors this for UI purposes and is
// the only thing allowed to call the setters below.

let vaultToken = null;

export function getVaultToken() {
  return vaultToken;
}

export function setVaultToken(token) {
  vaultToken = token || null;
}

export function clearVaultToken() {
  vaultToken = null;
}