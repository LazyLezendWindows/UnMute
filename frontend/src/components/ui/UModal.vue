<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="u-modal-backdrop position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
      @click.self="handleBackdropClick"
    >
      <div
        class="u-modal-container holo-panel w-100 position-relative animate-modal"
        :class="maxWidthClass"
        role="dialog"
        aria-modal="true"
      >
        <!-- Modal Top Specular Highlight -->
        <div class="modal-specular-bar position-absolute top-0 start-0 end-0"></div>

        <!-- Header -->
        <div v-if="title || $slots.header" class="u-modal-header px-4 py-3 d-flex align-items-center justify-content-between">
          <slot name="header">
            <h3 class="fw-bold mb-0 fs-6 font-display u-text-primary">{{ title }}</h3>
          </slot>
          <button
            type="button"
            @click="close"
            class="btn-close-custom btn btn-sm d-flex align-items-center justify-content-center p-1 rounded-circle border-0"
            aria-label="Close modal"
          >
            <i class="ri-close-line modal-close-icon"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="u-modal-body p-4 u-text-primary">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="u-modal-footer px-4 py-3 d-flex align-items-center justify-content-end gap-2">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
    closeOnBackdrop?: boolean;
  }>(),
  {
    maxWidth: 'md',
    closeOnBackdrop: true,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function close() {
  emit('close');
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    close();
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    case 'sm':
      return 'modal-max-sm';
    case 'lg':
      return 'modal-max-lg';
    case 'xl':
      return 'modal-max-xl';
    case 'md':
    default:
      return 'modal-max-md';
  }
});
</script>

<style scoped lang="scss">
.u-modal-backdrop {
  z-index: 1050;
  background-color: var(--unmute-scrim);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.u-modal-container {
  background: var(--unmute-modal-bg);
  border-radius: var(--unmute-radius-lg, 24px);
  // Stronger blur than cards: modal text sits over busy content.
  backdrop-filter: blur(36px) saturate(150%);
  -webkit-backdrop-filter: blur(36px) saturate(150%);
  box-shadow: var(--unmute-shadow-lg), 0 0 60px -10px var(--unmute-primary), var(--unmute-3d-card-rim);
  overflow: hidden;
}

.modal-max-sm { max-width: 384px; }
.modal-max-md { max-width: 448px; }
.modal-max-lg { max-width: 512px; }
.modal-max-xl { max-width: 576px; }

.modal-specular-bar {
  height: 2px;
  z-index: 1;
  background: var(--unmute-primary-gradient);
  box-shadow: 0 0 16px 1px var(--unmute-primary);
}

.u-modal-header {
  border-bottom: 1px solid var(--unmute-glass-border, rgba(15, 23, 42, 0.08));
}

.u-modal-footer {
  border-top: 1px solid var(--unmute-glass-border, rgba(15, 23, 42, 0.08));
  background-color: var(--unmute-glass-surface);
}

.btn-close-custom {
  background: var(--unmute-surface-overlay, rgba(15, 23, 42, 0.05));
  color: var(--unmute-text-muted, #64748b);
  transition: all 0.18s ease;

  &:hover {
    background: var(--unmute-surface-active);
    color: var(--unmute-text-primary, #0f172a);
    transform: scale(1.1);
  }

  .modal-close-icon {
    font-size: 1.125rem;
    line-height: 1;
  }
}
</style>
