<template>
  <div class="google-sign-in w-100 d-flex flex-column align-items-center gap-2">
    <p v-if="state === 'unavailable'" class="google-unavailable small text-center mb-0 w-100 py-2 px-3 rounded-3">
      Google sign-in is not available right now.
    </p>
    <div
      v-else
      ref="buttonSlot"
      class="google-button-slot w-100 d-flex justify-content-center"
      :class="{ 'is-busy': busy }"
      :aria-busy="busy"
    ></div>

    <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0 w-100 d-flex align-items-center gap-2" role="alert">
      <i class="ri-error-warning-line fs-5 flex-shrink-0" aria-hidden="true"></i>
      <span>{{ error }}</span>
    </div>

    <!-- First Google sign-in: Unmute is 18+, so a date of birth is required before an account exists. -->
    <UModal :isOpen="dobOpen" title="Confirm your age" maxWidth="sm" :closeOnBackdrop="false" @close="cancelDob">
      <form id="google-dob-form" class="d-flex flex-column gap-3" @submit.prevent="confirmDob">
        <div class="google-account d-flex align-items-center gap-3 p-3 rounded-3">
          <i class="ri-google-fill fs-4" aria-hidden="true"></i>
          <div class="small text-truncate">
            <div class="fw-bold">{{ pendingProfile?.displayName || 'Google account' }}</div>
            <div class="google-account-email text-truncate">{{ pendingProfile?.email }}</div>
          </div>
        </div>

        <p class="small mb-0 lh-base">
          Unmute is for adults only. Confirm your date of birth to finish creating your account. Only your age is shown to others.
        </p>

        <UInput v-model="dateOfBirth" label="Date of birth" type="date" required :max="maxDateFor18" :error="dobError" />
      </form>

      <template #footer>
        <UButton variant="secondary" size="md" @click="cancelDob">Cancel</UButton>
        <UButton type="submit" form="google-dob-form" variant="primary" size="md" :loading="busy" :disabled="!dateOfBirth">
          Create account
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import UModal from '../ui/UModal.vue';
import UInput from '../ui/UInput.vue';
import UButton from '../ui/UButton.vue';
import { useAuthStore } from '../../stores/auth';
import { useGoogleIdentity, GoogleButtonText } from '../../composables/useGoogleIdentity';
import { ApiError } from '../../services/api';

const props = withDefaults(defineProps<{ text?: GoogleButtonText }>(), { text: 'continue_with' });
const emit = defineEmits<{ (e: 'authenticated', isNewUser: boolean): void }>();

const authStore = useAuthStore();
const { resolveClientId, renderButton } = useGoogleIdentity();
// 'loading' keeps the button slot in place (no layout jump) while the client ID is resolved.
const state = ref<'loading' | 'ready' | 'unavailable'>('loading');

const buttonSlot = ref<HTMLElement | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

const dobOpen = ref(false);
const dateOfBirth = ref('');
const dobError = ref<string | null>(null);
const pendingProfile = ref<{ email: string; displayName: string } | null>(null);
// The Google ID token is held in memory only, for re-submission with the date of birth.
let pendingCredential: string | null = null;

const maxDateFor18 = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
})();

onMounted(async () => {
  if (!(await resolveClientId())) {
    state.value = 'unavailable';
    return;
  }
  state.value = 'ready';
  await nextTick();
  if (!buttonSlot.value) return;
  try {
    await renderButton(buttonSlot.value, handleCredential, props.text);
  } catch (err: any) {
    error.value = err.message;
  }
});

async function handleCredential(credential: string) {
  busy.value = true;
  error.value = null;
  try {
    const outcome = await authStore.loginWithGoogle({ credential });
    if (outcome.requiresDob) {
      pendingCredential = credential;
      pendingProfile.value = outcome.profile;
      dateOfBirth.value = '';
      dobError.value = null;
      dobOpen.value = true;
      return;
    }
    emit('authenticated', outcome.isNewUser);
  } catch (err: any) {
    error.value = err.message || 'Google sign-in failed. Please try again.';
  } finally {
    busy.value = false;
  }
}

async function confirmDob() {
  if (!pendingCredential || !dateOfBirth.value) return;
  busy.value = true;
  dobError.value = null;
  try {
    const outcome = await authStore.loginWithGoogle({ credential: pendingCredential, dateOfBirth: dateOfBirth.value });
    if (!outcome.requiresDob) {
      clearPending();
      emit('authenticated', outcome.isNewUser);
    }
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 401) {
      // The Google credential expired while the dialog was open; start again from the button.
      clearPending();
      error.value = 'Your Google sign-in expired. Please continue with Google again.';
    } else {
      dobError.value = err.message || 'Could not create your account.';
    }
  } finally {
    busy.value = false;
  }
}

function clearPending() {
  pendingCredential = null;
  pendingProfile.value = null;
  dobOpen.value = false;
}

function cancelDob() {
  clearPending();
}
</script>

<style scoped lang="scss">
.google-button-slot {
  min-height: 44px;

  &.is-busy {
    opacity: 0.6;
    pointer-events: none;
  }
}

.google-unavailable {
  color: var(--unmute-text-muted);
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
}

.google-account {
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
  color: var(--unmute-text-primary);
}

.google-account-email {
  color: var(--unmute-text-muted);
  max-width: 220px;
}
</style>
