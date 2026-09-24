import { io, Socket } from 'socket.io-client';
import { SOCKET_ORIGIN } from '../config';
import { nativeSessionToken } from '../platform/nativeSession';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/** Connects the realtime channel; the server authenticates it with the HttpOnly session cookie. */
export function connectSocket(): Socket {
  if (socket) {
    return socket;
  }

  // Keep retrying with backoff (a sleeping phone or a cold-starting server can take a while);
  // the chat store rejoins rooms and catches up on missed messages after every (re)connect.
  socket = io(SOCKET_ORIGIN, {
    withCredentials: true,
    // Native apps: the session token, read on every (re)connect. The web uses the cookie.
    // `visible` tells the server whether the member is looking at the app, so it can send push
    // notifications while the app is in the background (the socket may stay connected then).
    auth: (send) => {
      const token = nativeSessionToken();
      send({ ...(token ? { token } : {}), visible: isVisible() });
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  });

  document.addEventListener('visibilitychange', reportPresence);

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
}

function isVisible(): boolean {
  return document.visibilityState === 'visible';
}

function reportPresence(): void {
  if (socket?.connected) socket.emit('presence', { visible: isVisible() });
}

export function disconnectSocket(): void {
  document.removeEventListener('visibilitychange', reportPresence);
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
