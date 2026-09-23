import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const DURATION_MS: Record<ToastTone, number> = { success: 3500, info: 4000, error: 6000 };
const MAX_VISIBLE = 3;

/** App-wide transient notifications. Use for action outcomes; keep form validation inline. */
export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);
  let nextId = 1;
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function dismiss(id: number) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function show(message: string, tone: ToastTone = 'info') {
    // Repeated failures (e.g. a flaky connection) should not stack identical toasts.
    const existing = toasts.value.find((t) => t.message === message && t.tone === tone);
    if (existing) dismiss(existing.id);

    const toast: Toast = { id: nextId++, tone, message };
    toasts.value = [...toasts.value, toast].slice(-MAX_VISIBLE);
    timers.set(toast.id, setTimeout(() => dismiss(toast.id), DURATION_MS[tone]));
    return toast.id;
  }

  return {
    toasts,
    show,
    dismiss,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info'),
  };
});
