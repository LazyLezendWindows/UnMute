<template>
  <div class="u-input-wrapper w-100 d-flex flex-column gap-1">
    <div v-if="label || $slots.label" class="d-flex align-items-center justify-content-between">
      <label v-if="label" :for="inputId" class="form-label small fw-semibold mb-0 u-text-secondary" :class="{ 'visually-hidden': hideLabel }">
        {{ label }}
        <span v-if="required" class="text-danger" aria-hidden="true">*</span>
      </label>
      <slot name="label-right" />
    </div>

    <div class="position-relative d-flex align-items-center">
      <!-- Prefix icon: a component, or a Remix icon class such as "ri-mail-line" -->
      <div
        v-if="icon || iconClass"
        class="u-input-prefix position-absolute start-0 ms-3 pe-none d-flex align-items-center justify-content-center"
        aria-hidden="true"
      >
        <component :is="icon" v-if="icon" class="u-input-icon" />
        <i v-else :class="iconClass"></i>
      </div>

      <input
        :id="inputId"
        :type="inputType"
        :autocomplete="autocomplete"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :minlength="minlength"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : hint ? hintId : undefined"
        class="u-input w-100 rounded-2xl py-2 small transition-all"
        :class="[
          icon || iconClass ? 'ps-5' : 'ps-3',
          canReveal || $slots.suffix ? 'pe-5' : 'pe-3',
          error ? 'u-input-error' : 'u-input-normal',
          { 'opacity-50 pe-none': disabled },
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <!-- Password fields: show / hide what was typed -->
      <button
        v-if="canReveal"
        type="button"
        class="u-input-reveal position-absolute end-0 me-2"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        :aria-pressed="revealed"
        @click="revealed = !revealed"
      >
        <i :class="revealed ? 'ri-eye-off-line' : 'ri-eye-line'" aria-hidden="true"></i>
      </button>

      <!-- Suffix icon or action -->
      <div v-else-if="$slots.suffix" class="position-absolute end-0 me-3 d-flex align-items-center">
        <slot name="suffix" />
      </div>
    </div>

    <!-- Error message -->
    <p v-if="error" :id="errorId" class="small text-danger fw-medium d-flex align-items-center gap-1 mb-0 animate-fade-in">
      <span>{{ error }}</span>
    </p>

    <!-- Hint message -->
    <p v-else-if="hint" :id="hintId" class="u-input-hint small u-text-muted mb-0">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    label?: string;
    placeholder?: string;
    type?: string;
    error?: string | null;
    hint?: string;
    icon?: any;
    /** A Remix icon class shown before the text, e.g. "ri-mail-line". */
    iconClass?: string;
    autocomplete?: string;
    /** Keeps the label for assistive tech but shows only the placeholder (compact forms). */
    hideLabel?: boolean;
    /** Password fields get a show/hide toggle unless this is false. */
    revealable?: boolean;
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
    revealable: true,
  }
);

const revealed = ref(false);
const canReveal = computed(() => props.type === 'password' && props.revealable);
const inputType = computed(() => (canReveal.value && revealed.value ? 'text' : props.type));

// Labels, hints and errors are tied to the input so assistive tech announces them.
const autoId = useId();
const inputId = computed(() => props.id || `${autoId}-input`);
const hintId = `${autoId}-hint`;
const errorId = `${autoId}-error`;

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();
</script>

<style scoped lang="scss">
.u-input {
  min-height: 3rem;
  font-size: 0.9375rem !important;
  background-color: var(--unmute-input-bg);
  color: var(--unmute-text-primary);
  border: 1px solid var(--unmute-input-border);
  border-radius: var(--unmute-radius-sm) !important;
  outline: none;
}

.u-input::placeholder {
  color: var(--unmute-text-dim);
}

.u-input-normal:hover {
  border-color: var(--unmute-glass-border-hover);
}

.u-input-normal:focus {
  border-color: var(--unmute-primary);
  box-shadow: 0 0 0 4px var(--unmute-primary-surface);
}

.u-input-error {
  border-color: var(--unmute-danger);
  background-color: rgba(225, 29, 72, 0.04);
}

.u-input-error:focus {
  box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.15);
}

.u-input-prefix {
  color: var(--unmute-text-muted);
  font-size: 1.1rem;
}

.u-input-icon {
  width: 1rem;
  height: 1rem;
}

.u-input-reveal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--unmute-text-muted);
  font-size: 1.1rem;

  &:hover {
    color: var(--unmute-text-primary);
    background: var(--unmute-surface-overlay);
  }
}

.u-input-hint {
  font-size: 0.75rem;
}
</style>
