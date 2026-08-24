import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  getVaultStatus,
  setVaultPassword as apiSetVaultPassword,
  unlockVault as apiUnlockVault,
  disableVault as apiDisableVault,
  lockVault as apiLockVault,
  listVaultMembers,
  addToVault as apiAddToVault,
  removeFromVault as apiRemoveFromVault,
} from '../api/vault.js';
import { getVaultToken } from '../api/vaultToken.js';
import { useAuth } from './AuthContext.jsx';

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const { user } = useAuth();
  const [vaultEnabled, setVaultEnabled] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultedPeerIds, setVaultedPeerIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetVaultState = useCallback(() => {
    setVaultEnabled(false);
    setIsUnlocked(false);
    setVaultedPeerIds([]);
    setError(null);
  }, []);

// Deliberately NOT gated on unlock state — listVaultedPeerIds is safe to
  // call while locked (it returns only bare peer IDs, no profile data), and
  // the frontend needs this list even when locked, to decide whether opening
  // a given contact should route to the real thread or the decoy thread.
  const refreshMembers = useCallback(async () => {
    const { data } = await listVaultMembers();
    const ids = (Array.isArray(data) ? data : []).map(String);
    setVaultedPeerIds(ids);
    return ids;
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!user?.id) {
      resetVaultState();
      return null;
    }
    setLoading(true);
    setError(null);
    try {
     const { data } = await getVaultStatus();
      setVaultEnabled(Boolean(data?.vaultEnabled));
      // isUnlocked mirrors the in-memory token, not a server flag — the
      // server has no concept of "unlocked", only whether a valid
      // x-vault-token was presented on a given request.
      setIsUnlocked(Boolean(getVaultToken()));
      if (data?.vaultEnabled) await refreshMembers();
      return data;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, resetVaultState, refreshMembers]);

  // Vault status/lock state is per-account. On login, logout, or switching
  // accounts in the same tab, re-sync from scratch — never trust stale state
  // from a previous user.
  useEffect(() => {
    if (!user?.id) {
      resetVaultState();
      return;
    }
    refreshStatus();
    // Only re-run when the signed-in identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setPassword = useCallback(
    async ({ password, currentPassword }) => {
      setError(null);
      try {
        const result = await apiSetVaultPassword({ password, currentPassword });
        setVaultEnabled(true);
        return result;
      } catch (err) {
        const msg = err?.response?.data?.error || err.message;
        setError(msg);
        throw err;
      }
    },
    []
  );

  const unlock = useCallback(async (password) => {
    setError(null);
    try {
      const result = await apiUnlockVault({ password });
      setIsUnlocked(true);
      await refreshMembers();
      return result;
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      setError(msg);
      throw err;
    }
  }, [refreshMembers]);

  // Local-only: drop the in-memory token and flip UI state. No server call —
  // matches api/vault.js's lockVault(), which is intentionally client-side.
  const lock = useCallback(() => {
    apiLockVault();
    setIsUnlocked(false);
    setVaultedPeerIds([]);
  }, []);

  const disable = useCallback(async (password) => {
    setError(null);
    try {
      const result = await apiDisableVault({ password });
      setVaultEnabled(false);
      setIsUnlocked(false);
      setVaultedPeerIds([]);
      return result;
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      setError(msg);
      throw err;
    }
  }, []);

  const addPeer = useCallback(
    async (peerId) => {
      const result = await apiAddToVault(peerId);
      await refreshMembers();
      return result;
    },
    [refreshMembers]
  );

  const removePeer = useCallback(
    async (peerId) => {
      const result = await apiRemoveFromVault(peerId);
      await refreshMembers();
      return result;
    },
    [refreshMembers]
  );

  const isPeerVaulted = useCallback(
    (peerId) => vaultedPeerIds.includes(String(peerId)),
    [vaultedPeerIds]
  );

  const value = useMemo(
    () => ({
      vaultEnabled,
      isUnlocked,
      vaultedPeerIds,
      loading,
      error,
      refreshStatus,
      setPassword,
      unlock,
      lock,
      disable,
      addPeer,
      removePeer,
      isPeerVaulted,
    }),
    [
      vaultEnabled,
      isUnlocked,
      vaultedPeerIds,
      loading,
      error,
      refreshStatus,
      setPassword,
      unlock,
      lock,
      disable,
      addPeer,
      removePeer,
      isPeerVaulted,
    ]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}