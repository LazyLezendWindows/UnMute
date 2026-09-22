<template>
  <div
    class="u-skeleton rounded-2xl animate-shimmer relative overflow-hidden bg-slate-800/80"
    :class="[typeClass, customClass]"
    :style="customStyle"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type SkeletonType = 'text' | 'title' | 'avatar' | 'card' | 'button' | 'custom';

const props = withDefaults(
  defineProps<{
    type?: SkeletonType;
    width?: string;
    height?: string;
    customClass?: string;
  }>(),
  {
    type: 'text',
  }
);

const typeClass = computed(() => {
  switch (props.type) {
    case 'avatar':
      return 'w-12 h-12 rounded-2xl shrink-0';
    case 'title':
      return 'h-6 w-3/4 rounded-xl';
    case 'button':
      return 'h-10 w-full rounded-2xl';
    case 'card':
      return 'h-72 w-full rounded-3xl';
    case 'text':
    default:
      return 'h-4 w-full rounded-lg';
  }
});

const customStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.width) style.width = props.width;
  if (props.height) style.height = props.height;
  return style;
});
</script>

<style scoped>
.u-skeleton {
  background: linear-gradient(
    90deg,
    rgba(30, 38, 60, 0.6) 25%,
    rgba(45, 55, 85, 0.8) 50%,
    rgba(30, 38, 60, 0.6) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite ease-in-out;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
