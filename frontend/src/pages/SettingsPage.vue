<template>
  <div class="d-flex flex-column gap-4 max-w-3xl w-100">
    <PageHeader title="Settings" subtitle="Appearance, accent colour and privacy." />

    <!-- Appearance: Mode (Dark vs Light/White) -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2">
          <i v-if="!themeStore.isDarkMode" class="ri-sun-line fs-5 text-warning"></i>
          <i v-else class="ri-moon-line fs-5 u-text-accent-soft"></i>
          <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">
            Appearance & Theme Mode
          </h2>
        </div>

        <p class="small mb-2 u-text-secondary">
          Bright liquid glass (default), night glass, or follow your device.
        </p>

        <!-- Segmented Mode Selector with 3D tactile buttons -->
        <div class="row g-2 p-1 surface-raised rounded-3 border u-border-glass">
          <div v-for="option in THEME_MODES" :key="option.mode" class="col-4">
            <button
              type="button"
              @click="themeStore.setMode(option.mode)"
              class="theme-mode-btn w-100 d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2 py-2 px-2 border-0 rounded-3 small fw-bold user-select-none"
              :class="{ 'is-active': themeStore.mode === option.mode }"
            >
              <i class="fs-6" :class="option.icon"></i>
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Dynamic Theme Accent Colors -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <i class="ri-palette-line fs-5 u-text-accent"></i>
            <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">
              Dynamic Accent Theme
            </h2>
          </div>
          <span
            class="preset-badge badge rounded-pill text-white shadow-sm user-select-none font-display px-3 py-2"
            :style="presetVars(themeStore.activePreset)"
          >
            {{ themeStore.activePreset.name }}
          </span>
        </div>

        <p class="small mb-1 u-text-secondary">
          Pick the accent light used for buttons, highlights and the active dock item.
        </p>

        <!-- 6-Palette 3D Grid using Bootstrap row & cols -->
        <div class="row g-3 pt-2">
          <div
            v-for="preset in themeStore.presets"
            :key="preset.id"
            class="col-6 col-sm-4"
          >
            <button
              type="button"
              @click="themeStore.setAccent(preset.id)"
              class="preset-card-btn w-100 p-3 rounded-4 surface-raised d-flex flex-column align-items-center gap-2 text-center user-select-none border"
              :class="{ 'preset-active': themeStore.accent === preset.id }"
              :style="presetVars(preset)"
            >
              <!-- Swatch Circle with Specular 3D highlight -->
              <div class="swatch-circle rounded-3 d-flex align-items-center justify-content-center shadow position-relative overflow-hidden">
                <i v-if="themeStore.accent === preset.id" class="ri-check-line text-white fs-5 fw-bold"></i>
              </div>

              <!-- Name & Subtitle -->
              <div class="d-flex flex-column align-items-center">
                <span class="preset-name small fw-bold font-display">
                  {{ preset.name }}
                </span>
                <span class="extra-small fw-medium lh-sm u-text-dim">
                  {{ preset.subtitle }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Motion & 3D: how much the live backdrop may move (battery) -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2">
          <i class="ri-landscape-line fs-5 u-text-accent" aria-hidden="true"></i>
          <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">Motion &amp; 3D</h2>
        </div>
        <p class="small mb-0 u-text-secondary">{{ motionDescriptions[themeStore.motion] }}</p>
        <UChipGroup
          :model-value="themeStore.motion"
          :options="motionOptions"
          label="Motion and 3D background"
          @update:model-value="themeStore.setMotion"
        />
      </div>
    </UCard>

    <!-- Notifications: Web Push on this device -->
    <UCard v-if="pushStatus !== 'unsupported' || showInstallHint" variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2">
          <i class="ri-notification-3-line fs-5 u-text-accent" aria-hidden="true"></i>
          <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">Notifications</h2>
        </div>

        <p v-if="showInstallHint" class="small mb-0 u-text-secondary">
          On iPhone and iPad, add Unmute to your Home Screen (Share → Add to Home Screen) and open it from there to turn on notifications.
        </p>
        <template v-else>
          <button
            type="button"
            role="switch"
            :aria-checked="pushStatus === 'on'"
            class="account-action d-flex align-items-center justify-content-between gap-3 p-3 surface-raised rounded-4 border text-start transition-all u-border-glass"
            :disabled="pushBusy || pushStatus === 'unavailable' || pushStatus === 'denied' || pushStatus === 'loading'"
            @click="togglePush"
          >
            <div>
              <h3 class="small fw-bold mb-0 u-text-primary">New messages and matches</h3>
              <p class="extra-small mb-0 u-text-muted">{{ pushDescription }}</p>
            </div>
            <span class="push-switch" :class="{ 'is-on': pushStatus === 'on' }" aria-hidden="true">
              <span class="push-switch-knob"></span>
            </span>
          </button>
        </template>
      </div>
    </UCard>

    <!-- Privacy & Safety Shortcuts -->
    <UCard variant="default" padding="lg">
      <div class="d-flex flex-column gap-3">
        <h2 class="font-display fw-bold fs-6 mb-1 u-text-primary">
          Privacy & Account
        </h2>

        <router-link
          to="/safety"
          class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-decoration-none transition-all u-border-glass"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass text-warning">
              <i class="ri-shield-check-fill fs-5"></i>
            </div>
            <div>
              <h3 class="small fw-bold mb-0 u-text-primary">
                Safety & Blocked Users
              </h3>
              <p class="extra-small mb-0 u-text-muted">
                Manage blocked connections and safety commitments
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5 u-text-muted"></i>
        </router-link>

        <router-link
          to="/profile"
          class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-decoration-none transition-all u-border-glass"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass u-text-accent">
              <i class="ri-user-3-fill fs-5"></i>
            </div>
            <div>
              <h3 class="small fw-bold mb-0 u-text-primary">
                Edit Public Profile
              </h3>
              <p class="extra-small mb-0 u-text-muted">
                Update your bio, approximate location, and hobbies
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5 u-text-muted"></i>
        </router-link>

        <button
          type="button"
          class="account-action d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-start transition-all u-border-glass"
          :disabled="exporting"
          @click="handleExport"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass text-info">
              <i class="ri-download-2-line fs-5"></i>
            </div>
            <div>
              <h3 class="small fw-bold mb-0 u-text-primary">
                {{ exporting ? 'Preparing your data…' : 'Download my data' }}
              </h3>
              <p class="extra-small mb-0 u-text-muted">
                A copy of your profile, matches, messages you sent and account activity
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5 u-text-muted"></i>
        </button>

        <button
          type="button"
          class="account-action d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-start transition-all u-border-glass"
          @click="deactivateOpen = true"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass text-warning">
              <i class="ri-pause-circle-line fs-5"></i>
            </div>
            <div>
              <h3 class="small fw-bold mb-0 u-text-primary">
                Deactivate account
              </h3>
              <p class="extra-small mb-0 u-text-muted">
                Hide your profile and chats until you sign in again
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5 u-text-muted"></i>
        </button>

        <button
          type="button"
          class="account-action d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-start transition-all u-border-glass"
          @click="openDelete"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass text-danger">
              <i class="ri-delete-bin-6-line fs-5"></i>
            </div>
            <div>
              <h3 class="small fw-bold mb-0 text-danger">
                Delete account
              </h3>
              <p class="extra-small mb-0 u-text-muted">
                Permanently remove your account, profile, matches and messages
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5 u-text-muted"></i>
        </button>
      </div>
    </UCard>

    <UModal :isOpen="deactivateOpen" title="Deactivate your account?" maxWidth="sm" @close="deactivateOpen = false">
      <p class="small mb-0 lh-base">
        Your profile, matches and chats will be hidden from everyone and you will be signed out on every device.
        Sign in again any time to reactivate your account.
      </p>
      <template #footer>
        <UButton variant="secondary" size="md" @click="deactivateOpen = false">Cancel</UButton>
        <UButton variant="danger" size="md" :loading="accountBusy" @click="handleDeactivate">Deactivate</UButton>
      </template>
    </UModal>

    <UModal :isOpen="deleteOpen" title="Delete your account permanently?" maxWidth="sm" :closeOnBackdrop="false" @close="deleteOpen = false">
      <form id="delete-account-form" class="d-flex flex-column gap-3" @submit.prevent="handleDelete">
        <p class="small mb-0 lh-base">
          This removes your account, profile, photo, interests, matches and conversations. It cannot be undone.
          Reports made for safety reasons are kept, without your account details, as moderation records.
        </p>
        <UInput v-model="deleteConfirmation" label="Type DELETE to confirm" autocomplete="off" :error="deleteError" />
      </form>
      <template #footer>
        <UButton variant="secondary" size="md" @click="deleteOpen = false">Cancel</UButton>
        <UButton
          type="submit"
          form="delete-account-form"
          variant="danger"
          size="md"
          :loading="accountBusy"
          :disabled="deleteConfirmation !== 'DELETE'"
        >
          Delete account
        </UButton>
      </template>
    </UModal>

    <!-- App Info & Log out -->
    <div class="pt-2 d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 small u-text-muted">
      <span class="u-text-secondary">Unmute v1.0.0 — Connect without the pressure</span>
      <UButton
        variant="ghost"
        size="sm"
        @click="handleLogout"
      >
        Sign out
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import UChipGroup from '../components/ui/UChipGroup.vue';
import type { MotionPreference } from '../stores/theme';
import PageHeader from '../components/layout/PageHeader.vue';
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UButton from '../components/ui/UButton.vue';
import UModal from '../components/ui/UModal.vue';
import UInput from '../components/ui/UInput.vue';
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '../services/api';
import { useToastStore } from '../stores/toast';
import { useThemeStore, ThemeMode } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { disablePush, enablePush, needsHomeScreenInstall, pushState, type PushState } from '../platform/webPush';

const router = useRouter();
const themeStore = useThemeStore();
const authStore = useAuthStore();

const THEME_MODES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: 'ri-sun-line text-warning' },
  { mode: 'dark', label: 'Dark Mode', icon: 'ri-moon-line u-text-accent' },
  { mode: 'system', label: 'System Auto', icon: 'ri-computer-line text-info' },
];

/** A preset's colours as CSS custom properties; the styling itself lives in the stylesheet. */
function presetVars(preset: { primary: string; bevel: string; gradient: string; glow: string }) {
  return {
    '--preset-primary': preset.primary,
    '--preset-bevel': preset.bevel,
    '--preset-gradient': preset.gradient,
    '--preset-glow': preset.glow,
  };
}

const pushStatus = ref<PushState | 'loading'>('loading');
const pushBusy = ref(false);
const showInstallHint = needsHomeScreenInstall();

const pushDescription = computed(() => {
  switch (pushStatus.value) {
    case 'on':
      return 'On for this device. Notifications never show names or message text.';
    case 'denied':
      return 'Blocked in your browser settings. Allow notifications for this site to turn them on.';
    case 'unavailable':
      return 'Notifications are not available right now.';
    case 'loading':
      return 'Checking…';
    default:
      return 'Get notified on this device when the app is closed.';
  }
});

onMounted(async () => {
  const userId = authStore.user?.id;
  if (!userId) return;
  try {
    pushStatus.value = await pushState(userId);
  } catch {
    pushStatus.value = 'unavailable';
  }
});

async function togglePush() {
  const userId = authStore.user?.id;
  if (!userId || pushBusy.value) return;
  pushBusy.value = true;
  try {
    pushStatus.value = pushStatus.value === 'on' ? await disablePush() : await enablePush(userId);
    if (pushStatus.value === 'denied') toast.error('Notifications are blocked in your browser settings.');
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Could not change notifications. Please try again.');
  } finally {
    pushBusy.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

const toast = useToastStore();
const exporting = ref(false);
const accountBusy = ref(false);
const deactivateOpen = ref(false);
const deleteOpen = ref(false);
const deleteConfirmation = ref('');
const deleteError = ref<string | null>(null);

async function handleExport() {
  exporting.value = true;
  try {
    await authStore.exportData();
    toast.show('Your data export has been downloaded.', 'success');
  } catch (err) {
    toast.show((err as Error).message, 'error');
  } finally {
    exporting.value = false;
  }
}

async function handleDeactivate() {
  accountBusy.value = true;
  try {
    await authStore.deactivateAccount();
    deactivateOpen.value = false;
    toast.show('Your account is deactivated. Sign in again any time to come back.', 'info');
    router.push('/login');
  } catch (err) {
    toast.show((err as Error).message, 'error');
  } finally {
    accountBusy.value = false;
  }
}

function openDelete() {
  deleteConfirmation.value = '';
  deleteError.value = null;
  deleteOpen.value = true;
}

async function handleDelete() {
  if (deleteConfirmation.value !== 'DELETE') return;
  accountBusy.value = true;
  deleteError.value = null;
  try {
    await authStore.deleteAccount();
    deleteOpen.value = false;
    toast.show('Your account has been permanently deleted.', 'success');
    router.push('/login');
  } catch (err) {
    if (err instanceof ApiError && err.code === 'REAUTH_REQUIRED') {
      // Deletion needs a fresh sign-in; come straight back here afterwards.
      deleteOpen.value = false;
      toast.show(err.message, 'info');
      await authStore.logout();
      router.push({ path: '/login', query: { redirect: '/settings' } });
      return;
    }
    deleteError.value = (err as Error).message;
  } finally {
    accountBusy.value = false;
  }
}

const motionOptions: { value: MotionPreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'full', label: 'Full' },
  { value: 'calm', label: 'Calm' },
  { value: 'off', label: 'Off' },
];

const motionDescriptions: Record<MotionPreference, string> = {
  auto: 'The 3D scene moves while you use the app and rests when you stop. It holds still on low battery, data saver or reduced motion.',
  full: 'The 3D scene moves whenever you are using the app, even on low battery. It still rests when you stop.',
  calm: 'The 3D scene is shown as a still image. Lowest energy while keeping the look.',
  off: 'No 3D scene; a soft gradient instead.',
};
</script>

<style scoped lang="scss">
.theme-mode-btn {
  background: transparent;
  color: var(--unmute-text-secondary);
  transition: all 0.18s ease;
  &:hover {
    filter: brightness(1.05);
  }

  &.is-active {
    background: var(--unmute-surface);
    color: var(--unmute-text-primary);
    border: 1px solid var(--unmute-glass-border-hover) !important;
    box-shadow: 0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular);
  }
}

.preset-badge {
  background: var(--preset-gradient);
  box-shadow: 0 2px 0 var(--preset-bevel), var(--preset-glow), var(--unmute-3d-specular);
}

.preset-card-btn {
  background-color: var(--unmute-surface, #ffffff);
  border-color: var(--unmute-glass-border) !important;
  box-shadow: 0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover {
    filter: brightness(1.03);
  }

  &.preset-active {
    border-color: var(--preset-primary) !important;
    box-shadow: 0 5px 0 var(--preset-bevel), var(--preset-glow), var(--unmute-3d-specular);
    transform: translateY(-3px);
  }
}

.swatch-circle {
  width: 2.75rem;
  height: 2.75rem;
  background: var(--preset-gradient);
  box-shadow: 0 3px 0 var(--preset-bevel), inset 0 1.5px 0 rgba(255, 255, 255, 0.45);
}

.preset-name {
  color: var(--unmute-text-secondary);

  .preset-active & {
    color: var(--unmute-text-primary);
  }
}

.account-action {
  width: 100%;
  color: inherit;
  font: inherit;

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
}

.push-switch {
  flex-shrink: 0;
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 999px;
  background: var(--unmute-glass-border);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: background 0.2s ease;

  .push-switch-knob {
    position: absolute;
    top: 0.1875rem;
    left: 0.1875rem;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform 0.2s ease;
  }

  &.is-on {
    background: var(--unmute-primary);

    .push-switch-knob {
      transform: translateX(1.25rem);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .push-switch,
  .push-switch-knob {
    transition: none;
  }
}

.extra-small {
  font-size: 0.6875rem;
}
</style>
