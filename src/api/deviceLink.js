import client from './client.js';

export async function createDeviceLinkRequest() {
  const { data } = await client.post('/users/me/sessions/link');
  return data.data;
}

export async function verifyDeviceLink({ linkId, token, deviceLabel, deviceInfo }) {
  const { data } = await client.post('/users/sessions/link/verify', {
    linkId,
    token,
    deviceLabel,
    deviceInfo,
  });
  return data.data;
}

export async function approveDeviceLink(linkId) {
  const { data } = await client.post('/users/me/sessions/link/approve', { linkId });
  return data.data;
}

export async function rejectDeviceLink(linkId) {
  const { data } = await client.post('/users/me/sessions/link/reject', { linkId });
  return data.data;
}

export async function pollDeviceLinkStatus({ linkId, token }) {
  const { data } = await client.post('/users/sessions/link/status', { linkId, token });
  return data.data;
}

export async function claimDeviceLinkSession({ linkId, token }) {
  const { data } = await client.post('/users/sessions/link/claim', { linkId, token });
  return data.data;
}

export async function sendDeviceLinkEmail({ linkId, token }) {
  const { data } = await client.post('/users/me/sessions/link/email', { linkId, token });
  return data.data;
}

export async function listDeviceSessions() {
  const { data } = await client.get('/users/me/sessions');
  return data.data || [];
}

export async function revokeDeviceSession(sessionId) {
  const { data } = await client.delete(`/users/me/sessions/${sessionId}`);
  return data.data;
}

export function buildQrPayload(linkId, token) {
  return JSON.stringify({ linkId, token, v: 1 });
}

export function parseQrPayload(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.linkId && parsed?.token) {
      return { linkId: String(parsed.linkId), token: String(parsed.token) };
    }
  } catch {
    // fall through
  }

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(trimmed, 'https://local.invalid');
    const linkId = url.searchParams.get('linkId');
    const token = url.searchParams.get('token');
    if (linkId && token) return { linkId, token };
  } catch {
    // ignore
  }

  return null;
}
