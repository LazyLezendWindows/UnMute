<template>
  <div class="u-input-wrapper w-100 d-flex flex-column gap-1">
    <div v-if="label || $slots.label" class="d-flex align-items-center justify-content-between">
      <label v-if="label" class="form-label small fw-semibold mb-0" style="color: var(--unmute-text-secondary);">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </label>
      <slot name="label-right" />
    </div>

    <div class="position-relative d-flex align-items-center">
      <!-- Prefix Icon -->
      <div v-if="icon" class="position-absolute start-0 ms-3 pe-none d-flex align-items-center justify-content-center text-muted">
        <component :is="icon" style="width: 1rem; height: 1rem;" />
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
        class="u-input w-100 rounded-2xl py-2 small transition-all"
        :class="[
          icon ? 'ps-5 pe-3' : 'px-3',
          error ? 'u-input-error' : 'u-input-normal',
          { 'opacity-50 pe-none': disabled },
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <!-- Suffix icon or action -->
      <div v-if="$slots.suffix" class="position-absolute end-0 me-3 d-flex align-items-center">
        <slot name="suffix" />
      </div>
    </div>

    <!-- Error message -->
    <p v-if="error" class="small text-danger fw-medium d-flex align-items-center gap-1 mb-0 animate-fade-in">
      <span>{{ error }}</span>
    </p>

    <!-- Hint message -->
    <p v-else-if="hint" class="small text-muted mb-0" style="font-size: 0.72rem;">
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

