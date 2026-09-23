<template>
  <!-- Polite live region for confirmations; each error toast is its own assertive alert. -->
  <div class="u-toast-host" aria-live="polite" aria-relevant="additions">
    <TransitionGroup name="u-toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="u-toast d-flex align-items-start gap-2"
        :class="`u-toast-${toast.tone}`"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
      >
        <i class="u-toast-icon" :class="ICONS[toast.tone]" aria-hidden="true"></i>
        <p class="u-toast-message mb-0 flex-grow-1">{{ toast.message }}</p>
        <button type="button" class="u-toast-close" aria-label="Dismiss notification" @click="toastStore.dismiss(toast.id)">
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToastStore, ToastTone } from '../../stores/toast';

const toastStore = useToastStore();

const ICONS: Record<ToastTone, string> = {
  success: 'ri-checkbox-circle-fill',
  error: 'ri-error-warning-fill',
  info: 'ri-information-fill',
};
</script>

<style scoped lang="scss">
.u-toast-host {
  position: fixed;
  z-index: 1090;
  top: calc(env(safe-area-inset-top, 0px) + 4.75rem);
  left: 50%;
  transform: translateX(-50%);
  width: min(26rem, calc(100vw - 2rem));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.u-toast {
  pointer-events: auto;
  padding: 0.75rem 0.75rem 0.75rem 0.9rem;
  border-radius: var(--unmute-radius-sm);
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  border: 1px solid var(--unmute-glass-border);
  border-left-width: 4px;
  box-shadow: var(--unmute-shadow-lg), var(--unmute-3d-card-rim);
}

.u-toast-success {
  border-left-color: var(--unmute-success);
  .u-toast-icon { color: var(--unmute-success); }
}

.u-toast-error {
  border-left-color: var(--unmute-danger);
  .u-toast-icon { color: var(--unmute-danger); }
}

.u-toast-info {
  border-left-color: var(--unmute-primary);
  .u-toast-icon { color: var(--unmute-primary); }
}

.u-toast-icon {
  font-size: 1.1rem;
  line-height: 1.35;
}

.u-toast-message {
  font-size: var(--font-sm);
  line-height: 1.45;
}

.u-toast-close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin: -0.2rem -0.2rem 0 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--unmute-text-muted);

  &:hover {
    background: var(--unmute-surface-overlay);
    color: var(--unmute-text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--unmute-primary);
    outline-offset: 1px;
  }
}

.u-toast-enter-active,
.u-toast-leave-active {
  transition: opacity var(--unmute-transition-normal), transform var(--unmute-transition-normal);
}

.u-toast-enter-from,
.u-toast-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

@media (min-width: 768px) {
  .u-toast-host {
    left: auto;
    right: 1.5rem;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .u-toast-enter-active,
  .u-toast-leave-active {
    transition: none;
  }
}
</style>
