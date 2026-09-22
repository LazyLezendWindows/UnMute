<template>
  <div class="relative inline-block shrink-0 select-none">
    <div
      class="rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-white shadow-md transition-transform"
      :class="[sizeClass, border ? 'ring-2 ring-brand-500/50' : 'border border-slate-700/60']"
    >
      <img
        v-if="src && !hasError"
        :src="src"
        :alt="name || 'Avatar'"
        class="w-full h-full object-cover"
        @error="hasError = true"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center bg-gradient-to-tr from-brand-700 via-purple-600 to-pink-600"
      >
        <span>{{ initials }}</span>
      </div>
    </div>

    <!-- Optional Online / Active status badge with pulse glow -->
    <span
      v-if="online !== undefined"
      class="absolute -top-0.5 -right-0.5 rounded-full ring-2 ring-slate-900 shadow-sm"
      :class="[
        onlineSizeClass,
        online ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-slate-500',
      ]"
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
    online?: boolean;
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

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-6 h-6 text-[10px] rounded-lg';
    case 'sm':
      return 'w-8 h-8 text-xs rounded-xl';
    case 'lg':
      return 'w-14 h-14 text-base rounded-2xl';
    case 'xl':
      return 'w-20 h-20 text-xl rounded-3xl';
    case '2xl':
      return 'w-28 h-28 text-3xl rounded-3xl';
    case 'md':
    default:
      return 'w-10 h-10 text-sm rounded-xl';
  }
});

const onlineSizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-2 h-2';
    case 'sm':
      return 'w-2.5 h-2.5';
    case 'lg':
    case 'xl':
    case '2xl':
      return 'w-3.5 h-3.5';
    case 'md':
    default:
      return 'w-3 h-3';
  }
});
</script>
