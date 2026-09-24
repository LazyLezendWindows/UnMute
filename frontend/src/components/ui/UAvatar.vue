<template>
  <div class="u-avatar-wrapper position-relative d-inline-block flex-shrink-0 user-select-none">
    <div
      class="u-avatar overflow-hidden d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
      :class="[
        `u-avatar-${size}`,
        border ? 'u-avatar-bordered' : ''
      ]"
    >
      <img
        v-if="src && !hasError"
        :src="src"
        :alt="name || 'Avatar'"
        class="w-100 h-100 object-fit-cover"
        @error="hasError = true"
      />
      <div
        v-else
        class="w-100 h-100 d-flex align-items-center justify-content-center u-avatar-gradient"
      >
        <span>{{ initials }}</span>
      </div>
    </div>

    <!-- Optional status dot, only when a status is actually known -->
    <span
      v-if="status"
      class="u-avatar-status position-absolute rounded-circle"
      :class="[`status-${size}`, status === 'online' ? 'status-online' : 'status-offline']"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const props = withDefaults(
  defineProps<{
    src?: string;
    name?: string;
    size?: AvatarSize;
    /** Shows a dot; omit it when the member's status is unknown or hidden. */
    status?: 'online' | 'offline';
    border?: boolean;
  }>(),
  {
    size: 'md',
    border: false,
  }
);

const hasError = ref(false);

const initials = computed(() => {
  if (!props.name) return 'U';
  const parts = props.name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return props.name.slice(0, 2).toUpperCase();
});
</script>

<style scoped lang="scss">
.u-avatar {
  background-color: var(--unmute-surface-raised, #1e293b);
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.08));
  transition: transform var(--transition-bounce, 0.2s cubic-bezier(0.34, 1.56, 0.64, 1));

  &.u-avatar-bordered {
    box-shadow: 0 0 0 2px var(--unmute-primary);
  }
}

.u-avatar-gradient {
  background: var(--unmute-primary-gradient);
}

.u-avatar-xs {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.625rem;
  border-radius: var(--radius-sm, 8px);
}
.u-avatar-sm {
  width: 2rem;
  height: 2rem;
  font-size: 0.75rem;
  border-radius: var(--radius-md, 12px);
}
.u-avatar-md {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 0.875rem;
  border-radius: var(--radius-md, 14px);
}
.u-avatar-lg {
  width: 3.5rem;
  height: 3.5rem;
  font-size: 1rem;
  border-radius: var(--radius-lg, 18px);
}
.u-avatar-xl {
  width: 5rem;
  height: 5rem;
  font-size: 1.25rem;
  border-radius: var(--radius-xl, 24px);
}
.u-avatar-2xl {
  width: 7rem;
  height: 7rem;
  font-size: 1.75rem;
  border-radius: var(--radius-2xl, 30px);
}

.u-avatar-status {
  top: -2px;
  right: -2px;
  border: 2px solid var(--unmute-bg, #090d16);

  &.status-online {
    background-color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  }
  &.status-offline {
    background-color: #64748b;
  }

  &.status-xs { width: 0.5rem; height: 0.5rem; }
  &.status-sm { width: 0.625rem; height: 0.625rem; }
  &.status-md { width: 0.75rem; height: 0.75rem; }
  &.status-lg, &.status-xl, &.status-2xl { width: 0.875rem; height: 0.875rem; }
}
</style>
