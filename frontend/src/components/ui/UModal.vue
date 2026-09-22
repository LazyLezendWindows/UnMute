<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="u-modal-backdrop position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
      @click.self="handleBackdropClick"
    >
      <div
        class="u-modal-container w-100 position-relative animate-modal"
        :class="maxWidthClass"
        role="dialog"
        aria-modal="true"
      >
        <!-- Modal Top Specular Highlight -->
        <div class="modal-specular-bar position-absolute top-0 start-0 end-0"></div>

        <!-- Header -->
        <div v-if="title || $slots.header" class="u-modal-header px-4 py-3 d-flex align-items-center justify-content-between">
          <slot name="header">
            <h3 class="fw-bold mb-0 fs-6 text-white font-display">{{ title }}</h3>
          </slot>
          <button
            type="button"
            @click="close"
            class="btn-close-custom btn btn-sm d-flex align-items-center justify-content-center p-1 rounded-circle border-0 text-white-50"
            aria-label="Close modal"
          >
            <X class="modal-close-icon" />
          </button>
        </div>

        <!-- Body -->
        <div class="u-modal-body p-4">
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
import { X } from 'lucide-vue-next';

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
  background-color: rgba(3, 7, 18, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.u-modal-container {
  background: var(--unmute-surface, #0d1322);
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-xl, 24px);
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.8),
              0 0 35px -5px rgba(99, 102, 241, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.modal-max-sm { max-width: 384px; }
.modal-max-md { max-width: 448px; }
.modal-max-lg { max-width: 512px; }
.modal-max-xl { max-width: 576px; }

.modal-specular-bar {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--theme-primary, #6366f1), transparent);
}

.u-modal-header {
  border-bottom: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.07));
}

.u-modal-footer {
  border-top: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.07));
  background-color: rgba(0, 0, 0, 0.2);
}

.btn-close-custom {
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff !important;
    transform: scale(1.1);
  }

  .modal-close-icon {
    width: 1rem;
    height: 1rem;
  }
}
</style>
