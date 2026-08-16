/**
 * REST presence/typing client for hosts where Socket.IO cannot connect
 * (e.g. Vercel serverless API with no VITE_SIGNAL_URL).
 */
import client from './client.js';

export async function postPresenceHeartbeat({
  typingTo = null,
  typingGroupId = null,
  watchPeerId = null,
  watchGroupId = null,
} = {}) {
  const { data } = await client.post('/presence/heartbeat', {
    typingTo,
    typingGroupId,
    watchPeerId,
    watchGroupId,
  });
  return data?.data || { onlineUserIds: [], typing: [] };
}
