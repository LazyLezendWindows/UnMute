<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      @click.self="handleBackdropClick"
    >
      <div
        class="u-modal-container bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full relative overflow-hidden animate-modal"
        :class="maxWidthClass"
        role="dialog"
        aria-modal="true"
      >
        <!-- Modal Top Specular Highlight -->
        <div class="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-brand-400/40 to-transparent"></div>

        <!-- Header -->
        <div v-if="title || $slots.header" class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <slot name="header">
            <h3 class="font-bold text-base text-white tracking-tight">{{ title }}</h3>
          </slot>
          <button
            type="button"
            @click="close"
            class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-2">
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
      return 'max-w-sm';
    case 'lg':
      return 'max-w-lg';
    case 'xl':
      return 'max-w-xl';
    case 'md':
    default:
      return 'max-w-md';
  }
});
</script>

<style scoped>
.u-modal-container {
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 35px -5px rgba(124, 58, 237, 0.15);
}
</style>

