<template>
  <div class="u-input-wrapper w-full space-y-1.5">
    <div v-if="label || $slots.label" class="flex items-center justify-between">
      <label v-if="label" class="block text-xs font-semibold" style="color: var(--unmute-text-secondary);">
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
        class="u-input w-full rounded-2xl text-xs sm:text-sm transition-all focus:outline-none"
        :class="[
          icon ? 'pl-10 pr-4' : 'px-4',
          'py-2.5 sm:py-3',
          error ? 'u-input-error' : 'u-input-normal',
          { 'opacity-50 cursor-not-allowed': disabled },
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
  background-color: var(--unmute-input-bg);
  color: var(--unmute-text-primary);
  border: 1px solid var(--unmute-input-border);
  box-shadow: inset 0 2.5px 5px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.08);
}

.u-input::placeholder {
  color: var(--unmute-text-dim);
}

.u-input-normal:hover {
  border-color: var(--unmute-glass-border-hover);
}

.u-input-normal:focus {
  border-color: var(--unmute-primary);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 3.5px var(--unmute-primary-surface), var(--unmute-glow-primary);
}

.u-input-error {
  border-color: #f43f5e;
  background-color: rgba(244, 63, 94, 0.06);
}

.u-input-error:focus {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 3.5px rgba(244, 63, 94, 0.25);
}
</style>

