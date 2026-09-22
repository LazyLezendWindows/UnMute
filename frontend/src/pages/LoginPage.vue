<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden transition-colors" style="background-color: var(--unmute-bg); color: var(--unmute-text-primary);">
    <!-- Subtle Architectural Ambient Halos -->
    <div class="position-absolute ambient-halo-top rounded-circle pointer-events-none" style="background: radial-gradient(circle, var(--unmute-primary-surface) 0%, transparent 70%);"></div>
    <div class="position-absolute ambient-halo-bottom rounded-circle pointer-events-none" style="background: radial-gradient(circle, var(--unmute-primary-surface) 0%, transparent 70%);"></div>

    <div class="w-100 max-w-md position-relative" style="z-index: 10;">
      <UCard variant="elevated" padding="lg" class="shadow-2xl elyse-auth-card">
        <div class="d-flex flex-column gap-4">
          <!-- Editorial Brand Header -->
          <div class="text-center pt-2">
            <div
              class="auth-logo-badge d-inline-flex align-items-center justify-content-center mb-3"
              style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-btn-3d-shadow), var(--unmute-3d-specular);"
            >
              <i class="ri-voiceprint-fill text-white fs-2"></i>
            </div>
            <h1 class="brand-heading fs-2 fw-bold tracking-tight mb-1" style="color: var(--unmute-text-primary);">
              Welcome to Unmute
            </h1>
            <p class="small mb-0" style="color: var(--unmute-text-muted); font-family: 'Outfit', sans-serif;">
              A refined, conversation-first sanctuary
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0 d-flex align-items-center gap-2">
            <i class="ri-error-warning-line fs-5 flex-shrink-0"></i>
            <span>{{ error }}</span>
          </div>

          <!-- Google Authentication: Official Google Identity Container + Styled Button -->
          <div class="d-flex flex-column gap-2 align-items-center w-100">
            <!-- Native Google GIS Render Target (Used when VITE_GOOGLE_CLIENT_ID is active) -->
            <div ref="googleNativeBtnRef" class="w-100 d-flex justify-content-center" :class="{ 'd-none': !hasGoogleClientId }"></div>

            <!-- Styled Elyse Google Button (Fallback when Client ID not set or loading) -->
            <button
              v-if="!hasGoogleClientId"
              type="button"
              class="btn-google-auth w-100 d-flex align-items-center justify-content-center gap-3 py-2.5 px-4 rounded-3 user-select-none"
              :disabled="loading"
              @click="handleGoogleClick"
            >
              <svg class="google-icon" width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span class="fw-semibold small" style="color: var(--unmute-text-primary);">
                Continue with Google
              </span>
            </button>
          </div>

          <!-- Divider -->
          <div class="d-flex align-items-center gap-3">
            <hr class="flex-grow-1 my-0 opacity-25" />
            <span class="extra-small text-uppercase tracking-widest fw-semibold" style="color: var(--unmute-text-dim);">
              or with email
            </span>
            <hr class="flex-grow-1 my-0 opacity-25" />
          </div>

          <!-- Email / Password Form -->
          <form @submit.prevent="handleLogin" class="d-flex flex-column gap-3">
            <UInput
              v-model="email"
              label="Email address"
              type="email"
              required
              placeholder="you@domain.com"
            />

            <UInput
              v-model="password"
              label="Password"
              type="password"
              required
              placeholder="••••••••"
            />

            <div class="pt-2">
              <UButton
                type="submit"
                variant="primary"
                size="lg"
                block
                :loading="loading"
              >
                Sign in
              </UButton>
            </div>
          </form>

          <!-- Switch to Register -->
          <div class="text-center small pt-1" style="color: var(--unmute-text-muted);">
            Don't have an account?
            <router-link to="/register" class="fw-bold ms-1 text-decoration-none" style="color: var(--unmute-text-primary); text-decoration: underline !important;">
              Create account
            </router-link>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Google OAuth Setup & Test Modal (Shown if VITE_GOOGLE_CLIENT_ID not configured yet) -->
    <UModal
      :isOpen="showGoogleSetupModal"
      title="Google Sign-In Authentication"
      maxWidth="md"
      @close="showGoogleSetupModal = false"
    >
      <div class="d-flex flex-column gap-3">
        <div class="p-3 rounded-3 surface-raised border small" style="border-color: var(--unmute-glass-border) !important;">
          <div class="d-flex align-items-center gap-2 mb-2">
            <i class="ri-google-fill fs-5" style="color: var(--unmute-primary);"></i>
            <span class="fw-bold" style="color: var(--unmute-text-primary);">Google Identity Services</span>
          </div>
          <p class="mb-2 text-muted lh-base">
            For production deployment, add your OAuth Client ID from Google Cloud Console into <code class="p-1 rounded bg-light">frontend/.env</code> as <code class="p-1 rounded bg-light">VITE_GOOGLE_CLIENT_ID</code>.
          </p>
          <div class="extra-small text-muted">
            The app automatically mounts Google's official One-Tap and Sign-In popup whenever the client ID is present.
          </div>
        </div>

        <div>
          <label class="form-label small fw-semibold mb-2" style="color: var(--unmute-text-primary);">
            Instant Google Account Simulation:
          </label>
          <div class="d-flex flex-column gap-2">
            <button
              type="button"
              class="p-2.5 rounded-3 surface-raised border d-flex align-items-center justify-content-between text-start transition-all"
              style="border-color: var(--unmute-glass-border) !important;"
              @click="signInWithGoogleProfile('alex.vanguard@gmail.com', 'Alex Vanguard')"
            >
              <div class="d-flex align-items-center gap-2">
                <img src="https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=AlexVanguard" width="32" height="32" class="rounded-circle border" />
                <div class="small">
                  <div class="fw-bold" style="color: var(--unmute-text-primary);">Alex Vanguard</div>
                  <div class="text-muted extra-small">alex.vanguard@gmail.com</div>
                </div>
              </div>
              <i class="ri-arrow-right-line text-muted"></i>
            </button>

            <button
              type="button"
              class="p-2.5 rounded-3 surface-raised border d-flex align-items-center justify-content-between text-start transition-all"
              style="border-color: var(--unmute-glass-border) !important;"
              @click="signInWithGoogleProfile('elena.roche@gmail.com', 'Elena Roche')"
            >
              <div class="d-flex align-items-center gap-2">
                <img src="https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=ElenaRoche" width="32" height="32" class="rounded-circle border" />
                <div class="small">
                  <div class="fw-bold" style="color: var(--unmute-text-primary);">Elena Roche</div>
                  <div class="text-muted extra-small">elena.roche@gmail.com</div>
                </div>
              </div>
              <i class="ri-arrow-right-line text-muted"></i>
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <UButton variant="secondary" size="md" @click="showGoogleSetupModal = false">
          Close
        </UButton>
      </template>
    </UModal>

    <!-- Google 18+ Age Verification Modal (for first-time Google sign-ins) -->
    <UModal
      :isOpen="showDobModal"
      title="Age Verification (18+ Policy)"
      maxWidth="sm"
      :closeOnBackdrop="false"
      @close="showDobModal = false"
    >
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-3 p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-glass-border) !important;">
          <div class="rounded-circle d-flex align-items-center justify-content-center bg-primary-subtle p-2">
            <i class="ri-shield-check-fill fs-4" style="color: var(--unmute-primary);"></i>
          </div>
          <div class="small">
            <div class="fw-bold" style="color: var(--unmute-text-primary);">Google Account Linked</div>
            <div class="text-muted text-truncate" style="max-width: 220px;">{{ pendingGoogleData.email }}</div>
          </div>
        </div>

        <p class="small mb-0" style="color: var(--unmute-text-secondary); line-height: 1.5;">
          To ensure a safe adult environment, all Unmute members must be at least 18 years old. Please confirm your date of birth to complete registration.
        </p>

        <UInput
          v-model="googleDob"
          label="Date of Birth"
          type="date"
          required
          :max="maxDateFor18"
          hint="Only your age is shown publicly (never your birthdate)"
        />

        <div v-if="dobError" class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
          {{ dobError }}
        </div>
      </div>

      <template #footer>
        <UButton variant="secondary" size="md" @click="showDobModal = false">
          Cancel
        </UButton>
        <UButton
          variant="primary"
          size="md"
          :loading="loading"
          :disabled="!googleDob"
          @click="confirmGoogleDob"
        >
          Confirm & Enter
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UInput from '../components/ui/UInput.vue';
import UButton from '../components/ui/UButton.vue';
import UModal from '../components/ui/UModal.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

// Google Native Button & Modals
const googleNativeBtnRef = ref<HTMLElement | null>(null);
const showGoogleSetupModal = ref(false);
const showDobModal = ref(false);
const googleDob = ref('2000-01-01');
const dobError = ref<string | null>(null);

const hasGoogleClientId = computed(() => {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
});

const pendingGoogleData = ref({
  credential: '',
  googleId: '',
  email: '',
  displayName: '',
  avatarUrl: '',
});

const maxDateFor18 = computed(() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
});

onMounted(() => {
  initNativeGoogleIdentity();
});

function initNativeGoogleIdentity() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return;

  const tryInit = () => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleNativeBtnRef.value) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        (window as any).google.accounts.id.renderButton(googleNativeBtnRef.value, {
          type: 'standard',
          shape: 'pill',
          theme: 'outline',
          text: 'continue_with',
          size: 'large',
          width: 360,
        });
      } catch (err) {
        console.warn('[Google] Native GIS init error:', err);
      }
    } else {
      setTimeout(tryInit, 200);
    }
  };

  tryInit();
}

async function handleGoogleCredentialResponse(response: any) {
  if (!response?.credential) return;
  await processGoogleAuth({ credential: response.credential });
}

function handleGoogleClick() {
  error.value = null;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (clientId && typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    (window as any).google.accounts.id.prompt();
    return;
  }

  // Show clean in-app modal
  showGoogleSetupModal.value = true;
}

async function signInWithGoogleProfile(googleEmail: string, name: string) {
  showGoogleSetupModal.value = false;
  const demoGoogleId = 'goog_' + btoa(googleEmail.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

  await processGoogleAuth({
    googleId: demoGoogleId,
    email: googleEmail,
    displayName: name,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(googleEmail)}`,
  });
}

async function processGoogleAuth(payload: {
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
    const res = await authStore.loginWithGoogle(payload);
    if (res.requiresDob) {
      pendingGoogleData.value = {
        credential: payload.credential || '',
        googleId: res.googleId || payload.googleId || '',
        email: res.email || payload.email || '',
        displayName: res.displayName || payload.displayName || '',
        avatarUrl: res.avatarUrl || payload.avatarUrl || '',
      };
      googleDob.value = '2000-01-01';
      showDobModal.value = true;
      return;
    }

    if (res.isNewUser) {
      router.push('/profile');
    } else {
      router.push('/discover');
    }
  } catch (err: any) {
    error.value = err.message || 'Google authentication failed';
  } finally {
    loading.value = false;
  }
}

async function confirmGoogleDob() {
  if (!googleDob.value) {
    dobError.value = 'Please select your birthdate.';
    return;
  }
  dobError.value = null;
  loading.value = true;
  try {
    await processGoogleAuth({
      ...pendingGoogleData.value,
      dateOfBirth: googleDob.value,
    });
    showDobModal.value = false;
  } catch (err: any) {
    dobError.value = err.message || 'Age verification failed';
  } finally {
    loading.value = false;
  }
}

async function handleLogin() {
  loading.value = true;
  error.value = null;
  try {
    await authStore.login({ email: email.value, password: password.value });
    router.push('/discover');
  } catch (err: any) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.ambient-halo-top {
  top: -10rem;
  left: -10rem;
  width: 32rem;
  height: 32rem;
  filter: blur(80px);
  opacity: 0.8;
}

.ambient-halo-bottom {
  bottom: -10rem;
  right: -10rem;
  width: 32rem;
  height: 32rem;
  filter: blur(80px);
  opacity: 0.8;
}

.elyse-auth-card {
  border: 1px solid var(--unmute-glass-border, rgba(10, 10, 10, 0.08)) !important;
  background-color: var(--unmute-surface, #ffffff) !important;
  border-radius: var(--unmute-radius-xl, 32px);
}

.auth-logo-badge {
  width: 4rem;
  height: 4rem;
  border-radius: 20px;
}

.brand-heading {
  font-family: 'Playfair Display', Georgia, serif;
}

.btn-google-auth {
  background-color: var(--unmute-surface, #ffffff);
  border: 1px solid var(--unmute-input-border, #deddd9);
  box-shadow: var(--unmute-shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 1);
  transition: all var(--unmute-transition-fast);

  &:hover {
    background-color: var(--unmute-surface-raised, #faf9f6);
    border-color: var(--unmute-glass-border-hover, rgba(10, 10, 10, 0.2));
    box-shadow: var(--unmute-shadow-md);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }
}

.extra-small {
  font-size: 0.6875rem;
}
</style>
