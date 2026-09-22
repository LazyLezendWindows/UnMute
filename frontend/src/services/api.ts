import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // Secure HttpOnly session cookie transmission
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token if present (for mobile Capacitor or native token usage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('unmute_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Standardize error message extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // If unauthorized, clear local session tokens
    if (error.response?.status === 401) {
      localStorage.removeItem('unmute_token');
    }

    return Promise.reject(new Error(message));
  }
);
