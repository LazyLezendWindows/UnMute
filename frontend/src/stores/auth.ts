import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, onUnauthorized } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useGoogleIdentity } from '../composables/useGoogleIdentity';
import { User, Profile, LocationPrecision } from '../types';

/**
 * UNKNOWN: nothing checked yet. CHECKING_SESSION: asking the backend.
 * The backend's answer is the only thing that moves the app to AUTHENTICATED.
 */
export type AuthStatus = 'UNKNOWN' | 'CHECKING_SESSION' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export type GoogleAuthOutcome =
  | { requiresDob: true; profile: { email: string; displayName: string; avatarUrl: string } }
  | { requiresDob: false; isNewUser: boolean };

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('UNKNOWN');
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => status.value === 'AUTHENTICATED');
  const profile = computed<Profile | null>(() => user.value?.profile || null);

  let sessionCheck: Promise<void> | null = null;

  function setAuthenticated(nextUser: User) {
    user.value = nextUser;
    status.value = 'AUTHENTICATED';
    connectSocket();
  }

  function setUnauthenticated() {
    user.value = null;
    status.value = 'UNAUTHENTICATED';
    disconnectSocket();
  }

  onUnauthorized(() => {
    if (status.value === 'AUTHENTICATED') setUnauthenticated();
  });

  /** Restores the session from the HttpOnly cookie once; concurrent callers share the same request. */
  function ensureSession(): Promise<void> {
    if (status.value === 'AUTHENTICATED' || status.value === 'UNAUTHENTICATED') {
      return Promise.resolve();
    }
    if (!sessionCheck) {
      status.value = 'CHECKING_SESSION';
      sessionCheck = api
        .get('/auth/session')
        .then((res) => {
          const { authenticated, user: sessionUser } = res.data.data;
          if (authenticated) setAuthenticated(sessionUser);
          else setUnauthenticated();
        })
        .catch(() => setUnauthenticated())
        .finally(() => {
          sessionCheck = null;
        });
    }
    return sessionCheck;
  }

  async function run<T>(action: () => Promise<T>): Promise<T> {
    loading.value = true;
    error.value = null;
    try {
      return await action();
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function register(data: { email: string; password: string; displayName: string; dateOfBirth: string }) {
    return run(async () => {
      const res = await api.post('/auth/register', data);
      setAuthenticated(res.data.data.user);
    });
  }

  function login(credentials: { email: string; password: string }) {
    return run(async () => {
      const res = await api.post('/auth/login', credentials);
      setAuthenticated(res.data.data.user);
    });
  }

  /** Sends the Google ID token to the backend, which verifies it; include `dateOfBirth` to finish a new signup. */
  function loginWithGoogle(payload: { credential: string; dateOfBirth?: string }): Promise<GoogleAuthOutcome> {
    return run(async () => {
      const res = await api.post('/auth/google', payload);
      const result = res.data.data;
      if (result.requiresDob) {
        return { requiresDob: true, profile: result.profile };
      }
      setAuthenticated(result.user);
      return { requiresDob: false, isNewUser: result.isNewUser };
    });
  }

  async function fetchMe() {
    const res = await api.get('/auth/me');
    user.value = res.data.data;
    return user.value;
  }

  function updateProfile(data: Partial<Profile> & { interestIds?: string[] }) {
    return run(async () => {
      const res = await api.patch('/users/me', data);
      if (user.value) {
        user.value.profile = res.data.data;
      }
      return res.data.data;
    });
  }

  /** Location and education endpoints respond with the updated own profile. */
  async function applyProfile(request: Promise<{ data: { data: Profile } }>): Promise<Profile> {
    const res = await request;
    if (user.value) {
      user.value.profile = res.data.data;
    }
    return res.data.data;
  }

  function setLocation(
    payload:
      | { mode: 'place'; placeId: string; precision?: LocationPrecision }
      | { mode: 'pincode'; pincode: string; precision?: LocationPrecision }
      | { mode: 'device'; latitude: number; longitude: number; precision?: LocationPrecision }
  ) {
    return applyProfile(api.put('/users/me/location', payload));
  }

  function setLocationPrecision(precision: LocationPrecision) {
    return applyProfile(api.patch('/users/me/location', { precision }));
  }

  function clearLocation() {
    return applyProfile(api.delete('/users/me/location'));
  }

  function setEducation(payload: { institutionId: string; course: string; startYear: number | null; endYear: number | null }) {
    return applyProfile(api.put('/users/me/education', payload));
  }

  function clearEducation() {
    return applyProfile(api.delete('/users/me/education'));
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      useGoogleIdentity().disableAutoSelect();
      setUnauthenticated();
    }
  }

  return {
    status,
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    ensureSession,
    register,
    login,
    loginWithGoogle,
    fetchMe,
    updateProfile,
    setLocation,
    setLocationPrecision,
    clearLocation,
    setEducation,
    clearEducation,
    logout,
  };
});
