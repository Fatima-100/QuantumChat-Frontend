import { io } from 'socket.io-client';
import { getToken } from '../crypto/keyStorage.js';

let socket = null;

/**
 * The signaling target is a dedicated always-on bot (see calling-bot/),
 * separate from the Vercel-hosted API (which is a stateless serverless
 * function and can't hold a persistent Socket.IO connection). If it isn't
 * configured, sockets are simply unavailable and the app falls back to REST
 * polling for messages/calls, same as before.
 */
function getSignalUrl() {
  return String(import.meta.env.VITE_SIGNAL_URL || '').trim().replace(/\/$/, '');
}

export function connectSocket() {
  if (socket) return socket;

  const url = getSignalUrl();
  if (!url) return null;

  socket = io(url, {
    auth: { token: getToken() },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    timeout: 8000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
