<template>
  <div class="settings-page d-flex flex-column w-100 pb-5">
    <!-- Header -->
    <header class="settings-header d-flex align-items-center gap-2 mb-3">
      <button type="button" class="back-btn" @click="router.back()" aria-label="Go back">
        <i class="ri-arrow-left-line" aria-hidden="true"></i>
      </button>
      <h1 class="page-title mb-0">Settings</h1>
    </header>

    <div class="settings-list enter-rise d-flex flex-column gap-2">
      <!-- 1. Appearance & Theme -->
      <router-link to="/settings/appearance" class="settings-row">
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box">
            <i class="ri-lightbulb-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title">Appearance & Theme</span>
            <span class="row-sub">Light, dark or system theme</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line row-chevron" aria-hidden="true"></i>
      </router-link>

      <!-- 2. Accent Colour -->
      <router-link to="/settings/appearance" class="settings-row">
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box">
            <i class="ri-palette-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title">Accent Colour</span>
            <span class="row-sub">Choose your preferred colour</span>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="accent-dot-preview" :style="{ background: themeStore.activePreset.primary }"></span>
          <i class="ri-arrow-right-s-line row-chevron" aria-hidden="true"></i>
        </div>
      </router-link>

      <!-- 3. Privacy & Safety -->
      <router-link to="/safety" class="settings-row">
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box">
            <i class="ri-lock-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title">Privacy & Safety</span>
            <span class="row-sub">Control your privacy and safety</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line row-chevron" aria-hidden="true"></i>
      </router-link>

      <!-- 4. Notifications -->
      <div class="settings-row cursor-pointer" @click="togglePush">
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box">
            <i class="ri-notification-3-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title">Notifications</span>
            <span class="row-sub">Manage alerts and updates</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line row-chevron" aria-hidden="true"></i>
      </div>

      <!-- 5. Account Accordion Card -->
      <div class="settings-accordion-card" :class="{ 'is-open': accountExpanded }">
        <div
          role="button"
          tabindex="0"
          class="settings-row accordion-header cursor-pointer"
          @click="accountExpanded = !accountExpanded"
          @keydown.enter.prevent="accountExpanded = !accountExpanded"
          @keydown.space.prevent="accountExpanded = !accountExpanded"
          :aria-expanded="accountExpanded"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="row-icon-box">
              <i class="ri-user-3-line" aria-hidden="true"></i>
            </div>
            <div class="d-flex flex-column text-start">
              <span class="row-title">Account</span>
              <span class="row-sub">Email, password and account details</span>
            </div>
          </div>
          <i
            class="ri-arrow-right-s-line row-chevron"
            :class="{ 'rotate-down': accountExpanded }"
            aria-hidden="true"
          ></i>
        </div>

        <!-- Accordion Body with smooth CSS Grid transition -->
        <div class="accordion-collapse" :class="{ 'is-open': accountExpanded }">
          <div class="accordion-inner">
            <div class="accordion-sublist d-flex flex-column">
              <button
                type="button"
                class="sub-btn"
                :disabled="exporting"
                @click="handleExport"
              >
                <div class="d-flex align-items-center gap-3">
                  <div class="sub-icon-box">
                    <i class="ri-download-2-line" aria-hidden="true"></i>
                  </div>
                  <div class="d-flex flex-column text-start">
                    <span class="sub-title">{{ exporting ? 'Exporting...' : 'Download my data' }}</span>
                    <span class="sub-desc">Export your personal data and activity</span>
                  </div>
                </div>
                <i class="ri-arrow-right-s-line sub-chevron" aria-hidden="true"></i>
              </button>

              <button
                type="button"
                class="sub-btn"
                @click="deactivateOpen = true"
              >
                <div class="d-flex align-items-center gap-3">
                  <div class="sub-icon-box text-warning bg-warning-subtle">
                    <i class="ri-pause-circle-line" aria-hidden="true"></i>
                  </div>
                  <div class="d-flex flex-column text-start">
                    <span class="sub-title text-warning">Deactivate account</span>
                    <span class="sub-desc">Temporarily hide your profile and chats</span>
                  </div>
                </div>
                <i class="ri-arrow-right-s-line sub-chevron" aria-hidden="true"></i>
              </button>

              <button
                type="button"
                class="sub-btn"
                @click="openDelete"
              >
                <div class="d-flex align-items-center gap-3">
                  <div class="sub-icon-box text-danger bg-danger-subtle">
                    <i class="ri-delete-bin-line" aria-hidden="true"></i>
                  </div>
                  <div class="d-flex flex-column text-start">
                    <span class="sub-title text-danger">Delete account Permanently</span>
                    <span class="sub-desc">Permanently remove your account and all data</span>
                  </div>
                </div>
                <i class="ri-arrow-right-s-line sub-chevron" aria-hidden="true"></i>
              </button>

              <button
                type="button"
                class="sub-btn"
                @click="handleLogout"
              >
                <div class="d-flex align-items-center gap-3">
                  <div class="sub-icon-box text-danger bg-danger-subtle">
                    <i class="ri-logout-box-r-line" aria-hidden="true"></i>
                  </div>
                  <div class="d-flex flex-column text-start">
                    <span class="sub-title text-danger">Sign out</span>
                    <span class="sub-desc">Log out of this session</span>
                  </div>
                </div>
                <i class="ri-arrow-right-s-line sub-chevron" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. Blocked Users -->
      <router-link to="/safety" class="settings-row">
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box">
            <i class="ri-forbid-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title">Blocked Users</span>
            <span class="row-sub">Manage blocked connections</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line row-chevron" aria-hidden="true"></i>
      </router-link>

      <!-- 7. Help & Support -->
      <div class="settings-row cursor-pointer" @click="toast.info('Help & Support: support@unmute.social')">
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box">
            <i class="ri-question-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title">Help & Support</span>
            <span class="row-sub">FAQs and contact us</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line row-chevron" aria-hidden="true"></i>
      </div>

      <!-- 8. About Unmute -->
      <div class="settings-row">
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box">
            <i class="ri-information-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title">About Unmute</span>
            <span class="row-sub">Version 1.0.0</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line row-chevron" aria-hidden="true"></i>
      </div>

      <!-- 9. Sign Out (Prominent Outside Row) -->
      <button
        type="button"
        class="settings-row signout-row cursor-pointer w-100"
        @click="handleLogout"
      >
        <div class="d-flex align-items-center gap-3">
          <div class="row-icon-box signout-icon-box">
            <i class="ri-logout-box-r-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="row-title text-danger">Sign out</span>
            <span class="row-sub">Log out of your account on this device</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line row-chevron text-danger" aria-hidden="true"></i>
      </button>
    </div>

    <!-- Deactivate Modal -->
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

    <!-- Delete Modal -->
    <UModal :isOpen="deleteOpen" title="Delete your account permanently?" maxWidth="sm" :closeOnBackdrop="false" @close="deleteOpen = false">
      <form id="delete-account-form" class="d-flex flex-column gap-3" @submit.prevent="handleDelete">
        <p class="small mb-0 lh-base">
          This removes your account, profile, photo, interests, matches and conversations permanently. It cannot be undone.
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import UButton from '../components/ui/UButton.vue';
import UModal from '../components/ui/UModal.vue';
import UInput from '../components/ui/UInput.vue';
import { useToastStore } from '../stores/toast';
import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { ApiError } from '../services/api';
import { disablePush, enablePush, pushState, type PushState } from '../platform/webPush';

const router = useRouter();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const toast = useToastStore();

const accountExpanded = ref(false);
const pushStatus = ref<PushState | 'loading'>('loading');
const pushBusy = ref(false);

const exporting = ref(false);
const accountBusy = ref(false);
const deactivateOpen = ref(false);
const deleteOpen = ref(false);
const deleteConfirmation = ref('');
const deleteError = ref<string | null>(null);

async function togglePush() {
  const userId = authStore.user?.id;
  if (!userId || pushBusy.value) return;
  pushBusy.value = true;
  try {
    const next = pushStatus.value === 'on' ? await disablePush() : await enablePush(userId);
    pushStatus.value = next;
    toast.success(next === 'on' ? 'Notifications turned on' : 'Notifications turned off');
  } catch (err: any) {
    toast.error(err.message || 'Could not update notification preferences.');
  } finally {
    pushBusy.value = false;
  }
}

async function handleExport() {
  exporting.value = true;
  try {
    await authStore.exportData();
    toast.success('Your data export has been downloaded.');
  } catch (err: any) {
    toast.error(err.message || 'Export failed.');
  } finally {
    exporting.value = false;
  }
}

async function handleDeactivate() {
  accountBusy.value = true;
  try {
    await authStore.deactivateAccount();
    deactivateOpen.value = false;
    toast.info('Account deactivated.');
    router.push('/login');
  } catch (err: any) {
    toast.error(err.message || 'Deactivation failed.');
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
    toast.success('Your account has been deleted.');
    router.push('/login');
  } catch (err: any) {
    if (err instanceof ApiError && err.code === 'REAUTH_REQUIRED') {
      deleteOpen.value = false;
      toast.info(err.message);
      await authStore.logout();
      router.push({ path: '/login', query: { redirect: '/settings' } });
      return;
    }
    deleteError.value = err.message || 'Deletion failed.';
  } finally {
    accountBusy.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<style scoped lang="scss">
.settings-page {
  max-width: 28rem;
  margin: 0 auto;
}

.settings-header {
  padding: 0.5rem 0.25rem;
}

.page-title {
  font-family: var(--unmute-font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
  letter-spacing: -0.02em;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--unmute-text-primary);
  font-size: 1.35rem;
  cursor: pointer;
  transition: background var(--unmute-transition-fast);

  &:hover {
    background: var(--unmute-surface-raised);
  }
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-lg);
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 8px -2px rgba(70, 25, 55, 0.04);
  transition: all var(--unmute-transition-fast);

  &:hover {
    background: var(--unmute-surface-raised);
    border-color: var(--unmute-glass-border-hover);
  }
}

.row-icon-box {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--unmute-radius-md);
  background: #fdf2f8;
  color: var(--unmute-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.row-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.row-sub {
  font-size: 0.8125rem;
  color: var(--unmute-text-muted);
}

.row-chevron {
  font-size: 1.25rem;
  color: var(--unmute-text-muted);
  transition: transform var(--unmute-transition-fast);
}

.accent-dot-preview {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.settings-accordion-card {
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-lg);
  box-shadow: 0 2px 8px -2px rgba(70, 25, 55, 0.04);
  transition: border-color var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast);
  overflow: hidden;

  &:hover {
    border-color: var(--unmute-glass-border-hover);
  }

  &.is-open {
    border-color: rgba(225, 29, 72, 0.28);
    box-shadow: 0 4px 14px -2px rgba(70, 25, 55, 0.08);
  }

  .accordion-header {
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    padding: 0.85rem 1rem;
    margin: 0;
  }
}

.rotate-down {
  transform: rotate(90deg) !important;
}

.accordion-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-open {
    grid-template-rows: 1fr;
  }
}

.accordion-inner {
  overflow: hidden;
  min-height: 0;
}

.accordion-sublist {
  border-top: 1px solid var(--unmute-glass-border);
  padding: 0.35rem 0.65rem 0.65rem;
  gap: 0.25rem;
  background: rgba(253, 242, 248, 0.3);
}

.sub-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: var(--unmute-radius-md);
  border: none;
  background: transparent;
  color: var(--unmute-text-primary);
  cursor: pointer;
  text-align: left;
  transition: background var(--unmute-transition-fast);

  &:hover {
    background: var(--unmute-surface-raised);
  }

  &:active {
    background: rgba(225, 29, 72, 0.08);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.sub-icon-box {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: var(--unmute-radius-sm);
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
  border: 1px solid var(--unmute-glass-border);

  &.bg-warning-subtle {
    background: #fefce8;
    border-color: rgba(234, 179, 8, 0.2);
  }

  &.bg-danger-subtle {
    background: #fef2f2;
    border-color: rgba(239, 68, 68, 0.2);
  }
}

.sub-title {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.25;
}

.sub-desc {
  font-size: 0.75rem;
  color: var(--unmute-text-muted);
  line-height: 1.25;
}

.sub-chevron {
  font-size: 1.1rem;
  color: var(--unmute-text-muted);
}

.signout-row {
  border-color: rgba(239, 68, 68, 0.25);
  margin-top: 0.75rem;
  background: var(--unmute-surface);

  &:hover {
    background: #fff5f5;
    border-color: rgba(239, 68, 68, 0.45);
  }
}

.signout-icon-box {
  background: #fef2f2 !important;
  color: #ef4444 !important;
}
</style>
