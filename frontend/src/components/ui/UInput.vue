<template>
  <div class="u-input-wrapper w-full space-y-1.5">
    <div v-if="label || $slots.label" class="flex items-center justify-between">
      <label v-if="label" class="block text-xs font-semibold text-slate-300">
        {{ label }}
        <span v-if="required" class="text-pink-500">*</span>
      </label>
      <slot name="label-right" />
    </div>

    <div class="relative flex items-center">
      <!-- Prefix Icon -->
      <div v-if="icon" class="absolute left-3.5 pointer-events-none text-slate-400 flex items-center justify-center">
        <component :is="icon" class="w-4 h-4" />
      </div>

      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :minlength="minlength"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        class="u-input w-full bg-slate-850/90 text-white placeholder-slate-500 border rounded-2xl text-xs sm:text-sm transition-all focus:outline-none"
        :class="[
          icon ? 'pl-10 pr-4' : 'px-4',
          'py-2.5 sm:py-3',
          error
            ? 'border-rose-500/80 focus:ring-2 focus:ring-rose-500/40 bg-rose-500/5'
            : 'border-slate-700/80 hover:border-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30',
          { 'opacity-50 cursor-not-allowed bg-slate-900/50': disabled },
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <!-- Suffix icon or action -->
      <div v-if="$slots.suffix" class="absolute right-3 flex items-center">
        <slot name="suffix" />
      </div>
    </div>

    <!-- Error message -->
    <p v-if="error" class="text-[11px] text-rose-400 font-medium animate-fade-in flex items-center gap-1">
      <span>{{ error }}</span>
    </p>

    <!-- Hint message -->
    <p v-else-if="hint" class="text-[11px] text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string | number;
    label?: string;
    placeholder?: string;
    type?: string;
    error?: string | null;
    hint?: string;
    icon?: any;
    id?: string;
    disabled?: boolean;
    required?: boolean;
    minlength?: number;
    maxlength?: number;
    min?: string | number;
    max?: string | number;
  }>(),
  {
    type: 'text',
    disabled: false,
    required: false,
  }
);

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();
</script>

<style scoped>
.u-input {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
