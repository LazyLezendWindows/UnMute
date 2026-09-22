import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { User, Profile } from '../types';

export type AuthState = 'UNKNOWN' | 'CHECKING_SESSION' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export const useAuthStore = defineStore('auth', () => {
  const authState = ref<AuthState>('UNKNOWN');
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => authState.value === 'AUTHENTICATED');
  const isCheckingSession = computed(() => authState.value === 'CHECKING_SESSION');
  const profile = computed<Profile | null>(() => user.value?.profile || null);

  let checkSessionPromise: Promise<boolean> | null = null;

  /**
   * Verified server session check (Flicker-Free state machine)
   */
  async function checkSession(): Promise<boolean> {
    if (checkSessionPromise) return checkSessionPromise;

    authState.value = 'CHECKING_SESSION';
    checkSessionPromise = (async () => {
      try {
        const res = await api.get('/auth/session');
        if (res.data?.data) {
          user.value = res.data.data;
          authState.value = 'AUTHENTICATED';
          connectSocket();
          return true;
        }
        throw new Error('No user data');
      } catch {
        user.value = null;
        authState.value = 'UNAUTHENTICATED';
        disconnectSocket();
        return false;
      } finally {
        checkSessionPromise = null;
      }
    })();

    return checkSessionPromise;
  }

  async function register(data: {
    email: string;
    password: string;
    displayName: string;
    dateOfBirth: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.post('/auth/register', data);
      const resData = res.data.data;
      user.value = resData.user;
      authState.value = 'AUTHENTICATED';
      if (resData.token) {
        localStorage.setItem('unmute_token', resData.token);
      }
      connectSocket();
      return resData;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: { email: string; password: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.post('/auth/login', credentials);
      const resData = res.data.data;
      user.value = resData.user;
      authState.value = 'AUTHENTICATED';
      if (resData.token) {
        localStorage.setItem('unmute_token', resData.token);
      }
      connectSocket();
      return resData;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loginWithGoogle(payload: {
    credential: string;
    dateOfBirth?: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.post('/auth/google', payload);
      const result = res.data.data;
      if (result.requiresDob) {
        return {
          requiresDob: true,
          email: result.email,
          displayName: result.displayName,
          avatarUrl: result.avatarUrl,
        };
      }
      user.value = result.user;
      authState.value = 'AUTHENTICATED';
      if (result.token) {
        localStorage.setItem('unmute_token', result.token);
      }
      connectSocket();
      return {
        requiresDob: false,
        isNewUser: result.isNewUser,
        user: result.user,
      };
    } catch (err: any) {
      error.value = err.message || 'Google authentication failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    return checkSession();
  }

  async function updateProfile(data: Partial<Profile> & { interestIds?: string[] }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.patch('/users/me', data);
      if (user.value) {
        user.value.profile = res.data.data;
      }
      return res.data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      user.value = null;
      authState.value = 'UNAUTHENTICATED';
      localStorage.removeItem('unmute_token');
      disconnectSocket();
    }
  }

  return {
    authState,
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    isCheckingSession,
    checkSession,
    register,
    login,
    loginWithGoogle,
    fetchMe,
    updateProfile,
    logout,
  };
});
