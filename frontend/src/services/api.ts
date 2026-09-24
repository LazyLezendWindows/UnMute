import axios from 'axios';
import { API_BASE_URL } from '../config';
import { nativeSessionToken } from '../platform/nativeSession';

/** API error carrying the HTTP status so callers can distinguish auth failures from other errors. */
export class ApiError extends Error {
  /** `code` is the backend's machine-readable reason, when it sends one (e.g. REAUTH_REQUIRED). */
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Registered by the auth store so an expired/revoked session anywhere resets auth state. */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  // The session lives in an HttpOnly cookie set by the backend; JS never sees the token.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Native apps authenticate with their stored session token (web requests use the cookie).
api.interceptors.request.use((request) => {
  const token = nativeSessionToken();
  if (token) request.headers.set('Authorization', `Bearer ${token}`);
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    // Server faults carry no useful detail for users; client errors (4xx) explain what to fix.
    const message = !error.response
      ? 'Unable to reach Unmute. Check your connection.'
      : status !== undefined && status >= 500
        ? 'Something went wrong on our side. Please try again.'
        : error.response.data?.error || error.response.data?.message || 'Something went wrong. Please try again.';

    if (status === 401 && !String(error.config?.url || '').startsWith('/auth/')) {
      unauthorizedHandler?.();
    }

    return Promise.reject(new ApiError(message, status, error.response?.data?.code));
  }
);
