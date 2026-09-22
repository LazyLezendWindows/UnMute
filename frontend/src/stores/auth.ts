import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { User, Profile } from '../types';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('unmute_token'));
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(token.value));
  const profile = computed<Profile | null>(() => user.value?.profile || null);

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
      token.value = res.data.data.token;
      user.value = res.data.data.user;
      if (token.value) {
        localStorage.setItem('unmute_token', token.value);
        connectSocket(token.value);
      }
      return res.data.data;
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
      token.value = res.data.data.token;
      user.value = res.data.data.user;
      if (token.value) {
        localStorage.setItem('unmute_token', token.value);
        connectSocket(token.value);
      }
      return res.data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      const res = await api.get('/auth/me');
      user.value = res.data.data;
      connectSocket(token.value);
      return user.value;
    } catch {
      logout();
      return null;
    }
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

  async function loginWithGoogle(payload: {
    credential?: string;
    googleId?: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
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
          googleId: result.googleId,
          displayName: result.displayName,
          avatarUrl: result.avatarUrl,
        };
      }
      token.value = result.token;
      user.value = result.user;
      if (token.value) {
        localStorage.setItem('unmute_token', token.value);
        connectSocket(token.value);
      }
      return {
        requiresDob: false,
        isNewUser: result.isNewUser,
        user: result.user,
        token: result.token,
      };
    } catch (err: any) {
      error.value = err.message || 'Google authentication failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('unmute_token');
    disconnectSocket();
  }

  return {
    token,
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    loginWithGoogle,
    fetchMe,
    updateProfile,
    logout,
  };
});
