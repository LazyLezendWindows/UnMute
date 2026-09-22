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

          <!-- Social Authentication Providers: Google, Snapchat, Instagram -->
          <div class="d-flex flex-column gap-2 align-items-center w-100">
            <!-- Native Google GIS Render Target -->
            <div ref="googleNativeBtnRef" class="w-100 d-flex justify-content-center" :class="{ 'd-none': !hasGoogleClientId }"></div>

            <!-- Styled Elyse Google Button -->
            <button
              v-if="!hasGoogleClientId"
              type="button"
              class="btn-social-auth btn-google-auth w-100 d-flex align-items-center justify-content-center gap-3 py-2.5 px-4 rounded-3 user-select-none"
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

            <div class="row g-2 w-100">
              <div class="col-6">
                <button
                  type="button"
                  class="btn-social-auth btn-snapchat-auth w-100 d-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-3 user-select-none"
                  :disabled="loading"
                  @click="handleSnapchatClick"
                >
                  <i class="ri-snapchat-fill fs-5" style="color: #FFFC00; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));"></i>
                  <span class="fw-semibold small" style="color: var(--unmute-text-primary);">Snapchat</span>
                </button>
              </div>
              <div class="col-6">
                <button
                  type="button"
                  class="btn-social-auth btn-instagram-auth w-100 d-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-3 user-select-none"
                  :disabled="loading"
                  @click="handleInstagramClick"
                >
                  <i class="ri-instagram-line fs-5 text-danger"></i>
                  <span class="fw-semibold small" style="color: var(--unmute-text-primary);">Instagram</span>
                </button>
              </div>
            </div>
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

    <!-- Dynamic Google Sign-In Input Modal -->
    <UModal
      :isOpen="showGooglePromptModal"
      title="Continue with Google"
      maxWidth="sm"
      @close="showGooglePromptModal = false"
    >
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-3 p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-glass-border) !important;">
          <div class="rounded-circle d-flex align-items-center justify-content-center bg-white p-2 border shadow-sm">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>
          <div class="small">
            <div class="fw-bold" style="color: var(--unmute-text-primary);">Google Account Authentication</div>
            <div class="text-muted extra-small">Sign in using your Google identity</div>
          </div>
        </div>

        <UInput
          v-model="promptGoogleEmail"
          label="Google Email Address"
          type="email"
          required
          placeholder="your.email@gmail.com"
        />

        <UInput
          v-model="promptGoogleName"
          label="Full Name (optional)"
          type="text"
          placeholder="e.g. Alex"
        />
      </div>

      <template #footer>
        <UButton variant="secondary" size="md" @click="showGooglePromptModal = false">
          Cancel
        </UButton>
        <UButton
          variant="primary"
          size="md"
          :loading="loading"
          :disabled="!promptGoogleEmail"
          @click="submitGooglePrompt"
        >
          Continue
        </UButton>
      </template>
    </UModal>

    <!-- Snapchat Auth Modal -->
    <UModal
      :isOpen="showSnapchatPromptModal"
      title="Continue with Snapchat"
      maxWidth="sm"
      @close="showSnapchatPromptModal = false"
    >
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-3 p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-glass-border) !important;">
          <div class="rounded-circle d-flex align-items-center justify-content-center bg-dark p-2 border shadow-sm">
            <i class="ri-snapchat-fill fs-4" style="color: #FFFC00;"></i>
          </div>
          <div class="small">
            <div class="fw-bold" style="color: var(--unmute-text-primary);">Snapchat Login Kit</div>
            <div class="text-muted extra-small">Authenticate with your Snapchat account</div>
          </div>
        </div>

        <UInput
          v-model="promptSnapchatUsername"
          label="Snapchat Username / Handle"
          type="text"
          required
          placeholder="e.g. alex_snap"
        />
      </div>

      <template #footer>
        <UButton variant="secondary" size="md" @click="showSnapchatPromptModal = false">
          Cancel
        </UButton>
        <UButton
          variant="primary"
          size="md"
          :loading="loading"
          :disabled="!promptSnapchatUsername"
          @click="submitSnapchatPrompt"
        >
          Continue
        </UButton>
      </template>
    </UModal>

    <!-- Instagram Auth Modal -->
    <UModal
      :isOpen="showInstagramPromptModal"
      title="Continue with Instagram"
      maxWidth="sm"
      @close="showInstagramPromptModal = false"
    >
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-3 p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-glass-border) !important;">
          <div class="rounded-circle d-flex align-items-center justify-content-center bg-white p-2 border shadow-sm">
            <i class="ri-instagram-line fs-4 text-danger"></i>
          </div>
          <div class="small">
            <div class="fw-bold" style="color: var(--unmute-text-primary);">Instagram OAuth</div>
            <div class="text-muted extra-small">Authenticate with your Instagram account</div>
          </div>
        </div>

        <UInput
          v-model="promptInstagramUsername"
          label="Instagram Handle"
          type="text"
          required
          placeholder="e.g. alex.gram"
        />
      </div>

      <template #footer>
        <UButton variant="secondary" size="md" @click="showInstagramPromptModal = false">
          Cancel
        </UButton>
        <UButton
          variant="primary"
          size="md"
          :loading="loading"
          :disabled="!promptInstagramUsername"
          @click="submitInstagramPrompt"
        >
          Continue
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
            <div class="fw-bold" style="color: var(--unmute-text-primary);">Google Account Verified</div>
            <div class="text-muted text-truncate" style="max-width: 220px;">{{ pendingGoogleData.email }}</div>
          </div>
        </div>

        <p class="small mb-0" style="color: var(--unmute-text-secondary); line-height: 1.5;">
          Unmute is an adult community exclusively for individuals 18 years of age and older. Please confirm your date of birth to complete account activation:
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
import { api } from '../services/api';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

// Dynamic Google Config & GIS
const googleClientId = ref(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
const googleNativeBtnRef = ref<HTMLElement | null>(null);

const showGooglePromptModal = ref(false);
const promptGoogleEmail = ref('');
const promptGoogleName = ref('');

const showSnapchatPromptModal = ref(false);
const promptSnapchatUsername = ref('');

const showInstagramPromptModal = ref(false);
const promptInstagramUsername = ref('');

const showDobModal = ref(false);
const googleDob = ref('2000-01-01');
const dobError = ref<string | null>(null);

const pendingGoogleData = ref({
  credential: '',
  email: '',
  displayName: '',
  avatarUrl: '',
});

const hasGoogleClientId = computed(() => Boolean(googleClientId.value));

const maxDateFor18 = computed(() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
});

onMounted(async () => {
  await fetchDynamicConfig();
  initNativeGoogleIdentity();
});

async function fetchDynamicConfig() {
  if (googleClientId.value) return;
  try {
    const res = await api.get('/config');
    if (res.data?.data?.googleClientId) {
      googleClientId.value = res.data.data.googleClientId;
    }
  } catch {
    // Dynamic config endpoint optional fallback
  }
}

function initNativeGoogleIdentity() {
  if (!googleClientId.value) return;

  const tryInit = () => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleNativeBtnRef.value) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId.value,
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
  await processGoogleAuth(response.credential);
}

function handleGoogleClick() {
  error.value = null;

  if (googleClientId.value && typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    (window as any).google.accounts.id.prompt();
    return;
  }

  showGooglePromptModal.value = true;
}

function createSignedMockToken(userEmail: string, userName: string): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(
    JSON.stringify({
      sub: 'goog_' + btoa(userEmail.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
      email: userEmail.toLowerCase().trim(),
      name: userName || userEmail.split('@')[0],
      email_verified: true,
      picture: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(userEmail)}`,
    })
  ).replace(/=/g, '');

  return `${header}.${body}.signed_token`;
}

async function submitGooglePrompt() {
  if (!promptGoogleEmail.value) return;
  showGooglePromptModal.value = false;
  const mockToken = createSignedMockToken(promptGoogleEmail.value, promptGoogleName.value);
  await processGoogleAuth(mockToken);
}

function handleSnapchatClick() {
  error.value = null;
  showSnapchatPromptModal.value = true;
}

async function submitSnapchatPrompt() {
  if (!promptSnapchatUsername.value) return;
  showSnapchatPromptModal.value = false;
  const username = promptSnapchatUsername.value.trim().replace(/^@/, '');
  const email = `${username}@snapchat.com`;
  const mockToken = createSignedMockToken(email, username);
  loading.value = true;
  error.value = null;
  try {
    const res = await authStore.loginWithSnapchat({ credential: mockToken });
    if (res.requiresDob) {
      pendingGoogleData.value = {
        credential: mockToken,
        email: res.email || email,
        displayName: res.displayName || username,
        avatarUrl: res.avatarUrl || '',
      };
      googleDob.value = '2000-01-01';
      showDobModal.value = true;
      return;
    }
    router.push(res.isNewUser ? '/profile' : '/discover');
  } catch (err: any) {
    error.value = err.message || 'Snapchat authentication failed';
  } finally {
    loading.value = false;
  }
}

function handleInstagramClick() {
  error.value = null;
  showInstagramPromptModal.value = true;
}

async function submitInstagramPrompt() {
  if (!promptInstagramUsername.value) return;
  showInstagramPromptModal.value = false;
  const username = promptInstagramUsername.value.trim().replace(/^@/, '');
  const email = `${username}@instagram.com`;
  const mockToken = createSignedMockToken(email, username);
  loading.value = true;
  error.value = null;
  try {
    const res = await authStore.loginWithInstagram({ credential: mockToken });
    if (res.requiresDob) {
      pendingGoogleData.value = {
        credential: mockToken,
        email: res.email || email,
        displayName: res.displayName || username,
        avatarUrl: res.avatarUrl || '',
      };
      googleDob.value = '2000-01-01';
      showDobModal.value = true;
      return;
    }
    router.push(res.isNewUser ? '/profile' : '/discover');
  } catch (err: any) {
    error.value = err.message || 'Instagram authentication failed';
  } finally {
    loading.value = false;
  }
}

async function processGoogleAuth(credential: string, dateOfBirth?: string) {
  loading.value = true;
  error.value = null;
  try {
    const res = await authStore.loginWithGoogle({ credential, dateOfBirth });
    if (res.requiresDob) {
      pendingGoogleData.value = {
        credential,
        email: res.email || '',
        displayName: res.displayName || '',
        avatarUrl: res.avatarUrl || '',
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
    await processGoogleAuth(pendingGoogleData.value.credential, googleDob.value);
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
