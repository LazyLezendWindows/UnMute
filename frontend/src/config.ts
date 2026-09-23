/**
 * Where the backend lives. The web app is served next to the API, so relative URLs work; the
 * Capacitor apps run from a local origin and need an absolute VITE_API_URL
 * (e.g. https://api.example.com/api/v1).
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || '/api/v1';

/** Socket.IO connects to the API's origin (it serves /socket.io beside /api). */
export const SOCKET_ORIGIN: string = /^https?:\/\//i.test(API_BASE_URL)
  ? new URL(API_BASE_URL).origin
  : window.location.origin;
