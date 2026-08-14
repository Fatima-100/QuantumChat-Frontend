import client from './client.js';
import { setVaultToken, clearVaultToken } from './vaultToken.js';

export async function getVaultStatus() {
  const { data } = await client.get('/users/me/vault-lock/status');
  return data;
}

export async function setVaultPassword(payload) {
  // payload: { password } (and currentPassword if changing an existing one —
  // confirm exact shape against vaultAuthController.setVaultPassword)
  const { data } = await client.post('/users/me/vault-lock/set-password', payload);
  return data;
}

export async function unlockVault({ password }) {
  const { data } = await client.post('/users/me/vault-lock/unlock', { password });
  // Backend returns { success, data: { unlocked, vaultToken } } — confirmed
  // against vaultAuthController.unlockVault.
  const token = data?.data?.vaultToken;
  if (token) setVaultToken(token);
  return data;
}
export async function disableVault(payload) {
  const { data } = await client.post('/users/me/vault-lock/disable', payload);
  clearVaultToken();
  return data;
}

export function lockVault() {
  // Client-side-only "re-lock": just drop the in-memory token, no API call.
  clearVaultToken();
}

export async function listVaultMembers() {
  const { data } = await client.get('/users/me/vault-lock/members');
  return data;
}

export async function getPeerVaultDecoyStatus(peerId) {
  const { data } = await client.get(`/users/me/vault-lock/members/${peerId}/decoy-status`);
  return data;
}
export async function addToVault(peerId) {
  const { data } = await client.post('/users/me/vault-lock/members', { peerId });
  return data;
}

export async function removeFromVault(peerId) {
  const { data } = await client.delete(`/users/me/vault-lock/members/${peerId}`);
  return data;
}