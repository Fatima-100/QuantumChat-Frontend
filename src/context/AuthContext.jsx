import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client.js';
import { connectSocket, disconnectSocket } from '../api/socket.js';
import { clearVaultToken } from '../api/vaultToken.js';
import { derivePublicKey, generateKeySet, KEY_SET_SIZE } from '../crypto/keys.js';
import {
  addKeySetToRing,
  clearKeyring,
  clearSession,
  getKeyringSyncStatus,
  getStoredUser,
  getToken,
  hasKeyring,
  keyringMatchesPublishedKeys,
  saveSession
} from '../crypto/keyStorage.js';

const AuthContext = createContext(null);

function clearOtherAccountKeyring(loggedInUserId) {
  const previous = getStoredUser();
  if (previous?.id && String(previous.id) !== String(loggedInUserId)) {
    clearKeyring(previous.id);
  }
}

// Vault unlock is per-session, in-memory only, and never tied to a
// particular account by the server (the token just says "this JWT-holder's
// vault is unlocked"). If we log in as a different user in the same tab
// without a page reload, the old token must not silently carry over.
function lockVaultOnAccountSwitch(loggedInUserId) {
  const previous = getStoredUser();
  if (!previous?.id || String(previous.id) !== String(loggedInUserId)) {
    clearVaultToken();
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [keyringSync, setKeyringSync] = useState(null);

  const recomputeKeyringSync = useCallback((nextUser) => {
    if (!nextUser?.id || !nextUser.publicKeys?.length) {
      setKeyringSync(null);
      return null;
    }
    const sync = getKeyringSyncStatus(nextUser.id, nextUser.publicKeys);
    setKeyringSync(sync);
    return sync;
  }, []);

  const refreshUserFromServer = useCallback(async () => {
    if (!getToken()) return null;
    const { data } = await client.get('/auth/me');
    const freshUser = data.data?.user;
    if (!freshUser) return null;
    const nextToken = data.data?.token || getToken();
    saveSession(nextToken, freshUser);
    setUser(freshUser);
    recomputeKeyringSync(freshUser);
    return freshUser;
  }, [recomputeKeyringSync]);

  /** Fetch server-advertised public keys only (GET /users/me/public-keys) and compare to local keyring. */
  const verifyKeySync = useCallback(async () => {
    if (!getToken()) return null;
    const { data } = await client.get('/users/me/public-keys');
    const { publicKeys, keyRotatedAt } = data.data || {};
    const stored = getStoredUser();
    const freshUser = stored ? { ...stored, publicKeys, keyRotatedAt } : null;
    if (freshUser?.id) {
      saveSession(getToken(), freshUser);
      setUser(freshUser);
      return recomputeKeyringSync(freshUser);
    }
    return null;
  }, [recomputeKeyringSync]);

  // Restore socket + refresh session token when the app loads with a saved login.
  useEffect(() => {
    if (!user?.id || !getToken()) {
      setKeyringSync(null);
      return undefined;
    }
    recomputeKeyringSync(user);
    connectSocket();
    let cancelled = false;
    refreshUserFromServer().catch((err) => {
      if (cancelled) return;
      if (err?.response?.status === 401) {
        clearSession();
        disconnectSocket();
        setUser(null);
        setKeyringSync(null);
      }
    });
    return () => {
      cancelled = true;
    };
    // Only re-run when the signed-in user identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const register = useCallback(
    async ({ username, email, password, dateOfBirth, timezone }) => {
      const keySet = generateKeySet();
      const publicKeys = keySet.map((k) => k.publicKey);
      // Validate localStorage works before creating a server account whose keys we must store here.
      try {
        const probeKey = 'qc_keyring_probe_' + Date.now();
        localStorage.setItem(probeKey, '1');
        localStorage.removeItem(probeKey);
      } catch (err) {
        throw new Error('Cannot save keys to localStorage: ' + err.message);
      }

      const { data } = await client.post('/auth/register', {username,email,password,publicKeys,dateOfBirth: dateOfBirth || undefined,timezone,});
      const { token, user: newUser } = data.data;

      // CRITICAL: persist private keys before anything else that could navigate away.
      try {
        addKeySetToRing(newUser.id, keySet);
      } catch (err) {
        throw new Error(
          'Account was created but encryption keys could not be saved on this device. Log in and use "Generate new keys" to resync.'
        );
      }

      saveSession(token, newUser);
      setUser(newUser);
      recomputeKeyringSync(newUser);
      connectSocket();
      return { user: newUser, keySet };
    },
    [recomputeKeyringSync]
  );

   // Private keys stay on this device across logins. We only clear another
    // account's keyring when switching users, so the same account does not
    // re-prompt for keys.txt every session.
    // Best-effort — keeps the birthday-notification scheduler accurate if the
    // person has traveled since their last login. Never blocks or fails login.
    function refreshTimezoneSilently() {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone) client.patch('/users/me', { timezone }).catch(() => {});
      } catch {
        // Intl unsupported or blocked — not worth surfacing to the user.
      }
    }

  const login = useCallback(async ({ email, password, rememberMe = true }) => {
    const deviceLabel = String(navigator.userAgent || '').slice(0, 120);
    const { data } = await client.post('/auth/login', {
      email,
      password,
      deviceLabel,
      rememberMe,
    });
    if (data.data?.requires2fa) {
      return {
        requires2fa: true,
        tempToken: data.data.tempToken,
        rememberMe: data.data.rememberMe !== false,
      };
    }
   const { token, user: loggedInUser, sessionId } = data.data;
    clearOtherAccountKeyring(loggedInUser.id);
    lockVaultOnAccountSwitch(loggedInUser.id);
    saveSession(token, loggedInUser, sessionId);
    setUser(loggedInUser);
    connectSocket();
    refreshTimezoneSilently();
    return loggedInUser;
  }, []);

  const verify2fa = useCallback(async ({ tempToken, token, rememberMe = true }) => {
    const deviceLabel = String(navigator.userAgent || '').slice(0, 120);
    const { data } = await client.post('/auth/2fa/verify', {
      tempToken,
      token,
      deviceLabel,
      rememberMe,
    });
    const { token: jwt, user: loggedInUser, sessionId } = data.data;
    clearOtherAccountKeyring(loggedInUser.id);
    lockVaultOnAccountSwitch(loggedInUser.id);
    saveSession(jwt, loggedInUser, sessionId);
    setUser(loggedInUser);
    connectSocket();
    refreshTimezoneSilently();
    return loggedInUser;
  }, []);

  // Generates a fresh 5-key pool, adds it to the local keyring, and
  // publishes it to the server. Used to recover a missing or desynced keyring.
  const regenerateKeys = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const keySet = generateKeySet();
    const publicKeys = keySet.map((k) => k.publicKey);
    // CRITICAL: Save keys to localStorage FIRST, before publishing to server.
    addKeySetToRing(user.id, keySet);
    const { data } = await client.patch('/users/me/public-keys', { publicKeys });
    saveSession(getToken(), data.data);
    setUser(data.data);
    recomputeKeyringSync(data.data);
    return { user: data.data, keySet };
  }, [user, recomputeKeyringSync]);

  const importKeys = useCallback(
    async (secretKeys) => {
      if (!user) throw new Error('Not authenticated');
      if (secretKeys.length !== KEY_SET_SIZE) {
        throw new Error(`Expected ${KEY_SET_SIZE} keys in the file, found ${secretKeys.length}`);
      }
      const freshUser = (await refreshUserFromServer()) || user;
      const accountKeys = new Set(freshUser.publicKeys.map((k) => k.toLowerCase()));
      const keySet = secretKeys.map((secretKey) => ({ secretKey, publicKey: derivePublicKey(secretKey) }));
      const unmatched = keySet.filter((k) => !accountKeys.has(k.publicKey.toLowerCase()));
      if (unmatched.length > 0) {
        throw new Error(
          "These keys don't match this account's current public keys on the server — wrong file, or keys were regenerated since it was saved"
        );
      }
      // Local write only after server keys are fetched and validated (no server publish here).
      addKeySetToRing(freshUser.id, keySet);
      recomputeKeyringSync(freshUser);
      setUser({ ...freshUser });
    },
    [user, refreshUserFromServer, recomputeKeyringSync]
  );

  // Clears the auth session only. Encryption keys stay in localStorage so the
  // next login on this browser can chat without re-importing keys.txt; we
  // still reset the in-memory sync banner state since there's no user to show it for.
const logout = useCallback(() => {
    clearSession();
    clearVaultToken();
    disconnectSocket();
    setUser(null);
    setKeyringSync(null);
  }, []);
  const updateSessionUser = useCallback(
    (nextUser) => {
      if (!nextUser) return;
      saveSession(getToken(), nextUser);
      setUser(nextUser);
      recomputeKeyringSync(nextUser);
    },
    [recomputeKeyringSync]
  );

  // True when this device holds secret keys for every currently published
  // public key (the strict check); falls back to "has any local keyring at
  // all" before the server's publicKeys have loaded, so the UI doesn't flash
  // "no keys" during the first render.
  const hasLocalKeyring = user
    ? user.publicKeys?.length
      ? keyringMatchesPublishedKeys(user.id, user.publicKeys)
      : hasKeyring(user.id)
    : false;

  const keyringInSync = keyringSync?.status === 'synced';
  const keyringNeedsResync = Boolean(
    user && hasLocalKeyring && keyringSync && keyringSync.status !== 'synced' && keyringSync.status !== 'unknown'
  );

  const value = useMemo(
    () => ({
      user,
      register,
      login,
      verify2fa,
      logout,
      regenerateKeys,
      importKeys,
      hasLocalKeyring,
      keyringSync,
      keyringInSync,
      keyringNeedsResync,
      refreshUserFromServer,
      verifyKeySync,
      updateSessionUser,
    }),
    [
      user,
      register,
      login,
      verify2fa,
      logout,
      regenerateKeys,
      importKeys,
      hasLocalKeyring,
      keyringSync,
      keyringInSync,
      keyringNeedsResync,
      refreshUserFromServer,
      verifyKeySync,
      updateSessionUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}