import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, onUnauthorized } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useGoogleIdentity } from '../composables/useGoogleIdentity';
import { clearNativeSession, isNativeApp, restoreNativeSession, saveNativeSession } from '../platform/nativeSession';
import { forgetPush } from '../platform/webPush';
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
    void clearNativeSession();
  }

  /** Native apps receive and keep the session token; on the web the response carries none. */
  async function startSession(data: { user: User; sessionToken?: string }) {
    await saveNativeSession(data.sessionToken);
    setAuthenticated(data.user);
  }

  /** Signs out of Google on this device too, so the next sign-in can pick a different account. */
  async function forgetGoogleAccount() {
    if (isNativeApp) {
      await (await import('../platform/googleNative')).nativeGoogleSignOut();
    } else {
      useGoogleIdentity().disableAutoSelect();
    }
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
      sessionCheck = restoreNativeSession()
        .then(() => api.get('/auth/session'))
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
      await startSession(res.data.data);
    });
  }

  function login(credentials: { email: string; password: string }) {
    return run(async () => {
      const res = await api.post('/auth/login', credentials);
      await startSession(res.data.data);
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
      await startSession(result);
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

  /** Replaces the profile photo with an uploaded one (see platform/photoUpload). */
  async function uploadPhoto(file: File): Promise<Profile> {
    const { preparePhoto, uploadToCloudinary } = await import('../platform/photoUpload');
    const photo = await preparePhoto(file);
    const signed = await api.post('/users/me/photo/upload');
    const uploaded = await uploadToCloudinary(signed.data.data, photo);
    return applyProfile(api.put('/users/me/photo', uploaded));
  }

  function removePhoto(): Promise<Profile> {
    return applyProfile(api.delete('/users/me/photo'));
  }

  async function addPhoto(file: File): Promise<Profile> {
    const { preparePhoto, uploadToCloudinary } = await import('../platform/photoUpload');
    const photo = await preparePhoto(file);
    const signed = await api.post('/users/me/photo/upload');
    const uploaded = await uploadToCloudinary(signed.data.data, photo);
    return applyProfile(api.post('/users/me/photos', uploaded));
  }

  function setMainPhoto(photoId: string): Promise<Profile> {
    return applyProfile(api.put(`/users/me/photos/${photoId}/main`));
  }

  function removePhotoById(photoId: string): Promise<Profile> {
    return applyProfile(api.delete(`/users/me/photos/${photoId}`));
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

  /** Downloads everything Unmute stores about the member as a JSON file. */
  async function exportData(): Promise<void> {
    const res = await api.get('/users/me/export');
    const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'unmute-data-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Deactivation and deletion end every session server-side; the local state follows. */
  async function deactivateAccount(): Promise<void> {
    await api.post('/users/me/deactivate');
    await Promise.all([forgetGoogleAccount(), forgetPush()]);
    setUnauthenticated();
  }

  async function deleteAccount(): Promise<void> {
    await api.delete('/users/me', { data: { confirm: 'DELETE' } });
    await Promise.all([forgetGoogleAccount(), forgetPush()]);
    setUnauthenticated();
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      await Promise.all([forgetGoogleAccount(), forgetPush()]);
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
    uploadPhoto,
    removePhoto,
    addPhoto,
    setMainPhoto,
    removePhotoById,
    setLocation,
    setLocationPrecision,
    clearLocation,
    setEducation,
    clearEducation,
    exportData,
    deactivateAccount,
    deleteAccount,
    logout,
  };
});
