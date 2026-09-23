import axios from 'axios';

/** API error carrying the HTTP status so callers can distinguish auth failures from other errors. */
export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Registered by the auth store so an expired/revoked session anywhere resets auth state. */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  // The session lives in an HttpOnly cookie set by the backend; JS never sees the token.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (error.response ? 'An unexpected error occurred' : 'Unable to reach Unmute. Check your connection.');

    if (status === 401 && !String(error.config?.url || '').startsWith('/auth/')) {
      unauthorizedHandler?.();
    }

    return Promise.reject(new ApiError(message, status));
  }
);
