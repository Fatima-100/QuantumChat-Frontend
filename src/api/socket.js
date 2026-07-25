import { io } from 'socket.io-client';
import { getToken } from '../crypto/keyStorage.js';
import { getApiBaseUrl } from './baseUrl.js';

let socket = null;
let socketDisabled = false;

/**
 * Socket.IO is not available on the Vercel serverless QuantumChat API
 * (requests to /socket.io return 404). Skip connecting there to avoid console spam;
 * the app already polls REST for messages.
 */
function shouldSkipSocket() {
  const api = getApiBaseUrl();
  if (/vercel\.app/i.test(api)) return true;
  if (typeof window !== 'undefined' && /\.vercel\.app$/i.test(window.location.hostname)) {
    return /vercel\.app/i.test(api);
  }
  return false;
}

export function connectSocket() {
  if (socket) return socket;
  if (socketDisabled || shouldSkipSocket()) {
    socketDisabled = true;
    return null;
  }

  const url = getApiBaseUrl();
  socket = io(url, {
    auth: { token: getToken() },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 3,
    timeout: 8000,
  });

  socket.on('connect_error', () => {
    // After repeated failures (e.g. serverless 404), stop retrying.
    if (socket?.io?._reconnectionAttempts >= 3) {
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
      socket = null;
      socketDisabled = true;
    }
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
