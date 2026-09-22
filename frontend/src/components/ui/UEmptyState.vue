<template>
  <div class="u-empty-state text-center py-16 px-6 max-w-md mx-auto flex flex-col items-center justify-center relative">
    <!-- Soft ambient glow background blob -->
    <div class="absolute w-40 h-40 rounded-full bg-brand-500/10 blur-3xl pointer-events-none -z-10"></div>

    <!-- Icon container with subtle float -->
    <div class="w-16 h-16 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-750 flex items-center justify-center text-brand-400 mb-4 shadow-xl animate-float">
      <component :is="icon" v-if="icon" class="w-8 h-8 stroke-[1.75]" />
      <slot name="icon" v-else />
    </div>

    <!-- Title & Description -->
    <h3 class="text-base sm:text-lg font-bold text-white tracking-tight mb-1.5">
      {{ title }}
    </h3>
    <p class="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
      {{ description }}
    </p>

    <!-- Action Slot -->
    <div v-if="$slots.action" class="flex flex-wrap items-center justify-center gap-2">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  icon?: any;
}>();
</script>
