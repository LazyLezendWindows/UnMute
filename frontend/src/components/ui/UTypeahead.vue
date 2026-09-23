<template>
  <div ref="root" class="u-typeahead w-100 d-flex flex-column gap-1 position-relative">
    <label v-if="label" :for="inputId" class="form-label small fw-semibold mb-0 u-text-secondary">{{ label }}</label>

    <!-- Selected value: shown as a chip so it is clear the choice is made, not just typed. -->
    <div v-if="modelValue" class="u-typeahead-selected d-flex align-items-center gap-2 rounded-2xl px-3 py-2 small">
      <i v-if="icon" :class="icon" class="u-text-accent flex-shrink-0" aria-hidden="true"></i>
      <div class="flex-grow-1 text-truncate">
        <div class="fw-semibold text-truncate u-text-primary">{{ itemLabel(modelValue) }}</div>
        <div v-if="itemMeta" class="u-typeahead-meta text-truncate u-text-muted">{{ itemMeta(modelValue) }}</div>
      </div>
      <button
        type="button"
        class="u-typeahead-clear btn btn-sm border-0 p-1 d-flex align-items-center"
        :aria-label="`Clear ${label || 'selection'}`"
        :disabled="disabled"
        @click="clear"
      >
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </div>

    <div v-else>
      <div class="position-relative">
        <i v-if="icon" :class="icon" class="u-typeahead-icon position-absolute top-50 translate-middle-y u-text-muted" aria-hidden="true"></i>
        <input
          :id="inputId"
          ref="input"
          v-model="query"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          :placeholder="placeholder"
          :disabled="disabled"
          :aria-expanded="open"
          :aria-controls="listboxId"
          aria-autocomplete="list"
          :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
          :aria-describedby="hint ? hintId : undefined"
          class="u-typeahead-input w-100 rounded-2xl py-2 small"
          :class="icon ? 'ps-5 pe-3' : 'px-3'"
          @input="onInput"
          @keydown="onKeydown"
          @focus="onFocus"
        />
      </div>

      <ul
        v-show="open"
        :id="listboxId"
        role="listbox"
        :aria-label="label || placeholder"
        class="u-typeahead-list list-unstyled mt-1 mb-0 py-1 rounded-3 overflow-auto"
      >
        <li
          v-for="(item, index) in items"
          :id="optionId(index)"
          :key="itemKey(item)"
          role="option"
          :aria-selected="index === activeIndex"
          class="u-typeahead-option px-3 py-2 small"
          :class="{ 'is-active': index === activeIndex }"
          @mousedown.prevent="select(item)"
          @mousemove="activeIndex = index"
        >
          <div class="fw-semibold u-text-primary text-truncate">{{ itemLabel(item) }}</div>
          <div v-if="itemMeta" class="u-typeahead-meta u-text-muted text-truncate">{{ itemMeta(item) }}</div>
        </li>
        <li v-if="status" class="px-3 py-2 small u-text-muted" role="presentation">{{ status }}</li>
      </ul>
    </div>

    <p v-if="hint" :id="hintId" class="u-typeahead-hint small u-text-muted mb-0">{{ hint }}</p>
    <span class="visually-hidden" aria-live="polite">{{ liveMessage }}</span>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: T | null;
    /** Loads options for a query; rejections are shown inline as the error message. */
    fetchItems: (query: string) => Promise<T[]>;
    itemKey: (item: T) => string;
    itemLabel: (item: T) => string;
    itemMeta?: (item: T) => string;
    label?: string;
    placeholder?: string;
    hint?: string;
    icon?: string;
    minChars?: number;
    disabled?: boolean;
  }>(),
  { minChars: 2, disabled: false }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: T | null): void }>();

const uid = useId();
const inputId = `${uid}-input`;
const listboxId = `${uid}-listbox`;
const hintId = `${uid}-hint`;
const optionId = (index: number) => `${uid}-option-${index}`;

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const query = ref('');
const items = shallowRef<T[]>([]);
const activeIndex = ref(-1);
const loading = ref(false);
const error = ref<string | null>(null);
const open = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
// Only the latest request may update the list; slower earlier responses are dropped.
let requestSeq = 0;

const status = computed(() => {
  if (loading.value) return 'Searching…';
  if (error.value) return error.value;
  if (query.value.trim().length >= props.minChars && items.value.length === 0) return 'No matches';
  return '';
});

const liveMessage = computed(() => {
  if (!open.value || loading.value) return '';
  if (error.value) return error.value;
  return items.value.length ? `${items.value.length} results available` : status.value;
});

function onInput() {
  clearTimeout(debounceTimer);
  error.value = null;
  activeIndex.value = -1;
  const term = query.value.trim();
  if (term.length < props.minChars) {
    items.value = [];
    open.value = false;
    loading.value = false;
    return;
  }
  loading.value = true;
  open.value = true;
  debounceTimer = setTimeout(() => search(term), 250);
}

async function search(term: string) {
  const seq = ++requestSeq;
  try {
    const result = await props.fetchItems(term);
    if (seq !== requestSeq) return;
    items.value = result;
    activeIndex.value = result.length ? 0 : -1;
  } catch (err: any) {
    if (seq !== requestSeq) return;
    items.value = [];
    error.value = err?.message || 'Search failed. Please try again.';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function onFocus() {
  if (query.value.trim().length >= props.minChars) open.value = true;
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (!open.value && items.value.length) open.value = true;
      if (items.value.length) activeIndex.value = (activeIndex.value + 1) % items.value.length;
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (items.value.length) activeIndex.value = (activeIndex.value - 1 + items.value.length) % items.value.length;
      break;
    case 'Enter':
      if (open.value && activeIndex.value >= 0) {
        event.preventDefault();
        select(items.value[activeIndex.value]);
      }
      break;
    case 'Escape':
      if (open.value) {
        event.preventDefault();
        open.value = false;
      }
      break;
  }
}

function select(item: T) {
  emit('update:modelValue', item);
  open.value = false;
  query.value = '';
  items.value = [];
  activeIndex.value = -1;
}

function clear() {
  emit('update:modelValue', null);
  // The input only exists once the chip is gone.
  requestAnimationFrame(() => input.value?.focus());
}

function onDocumentPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown));
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  clearTimeout(debounceTimer);
});
</script>

<style scoped lang="scss">
.u-typeahead-input {
  background-color: var(--unmute-input-bg);
  color: var(--unmute-text-primary);
  border: 1px solid var(--unmute-input-border);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.25), 0 1px 0 var(--unmute-glass-highlight);
  backdrop-filter: blur(10px);
  outline: none;
  transition: border-color var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast);

  &::placeholder {
    color: var(--unmute-text-dim);
  }

  &:hover {
    border-color: var(--unmute-glass-border-hover);
  }

  &:focus {
    border-color: var(--unmute-primary);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2), 0 0 0 3px var(--unmute-primary-surface), 0 0 24px -4px var(--unmute-primary);
  }
}

.u-typeahead-icon {
  left: 1rem;
  line-height: 1;
}

/* In the page flow rather than floating: cards and modals clip overflow, and on phones a list
   that pushes content down is easier to use than one layered over it. */
.u-typeahead-list {
  max-height: 16rem;
  background-color: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.u-typeahead-option {
  cursor: pointer;

  &.is-active {
    background-color: var(--unmute-primary-surface);
  }
}

.u-typeahead-selected {
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
}

.u-typeahead-clear {
  color: var(--unmute-text-muted);
  background: transparent;

  &:hover,
  &:focus-visible {
    color: var(--unmute-text-primary);
  }
}

.u-typeahead-meta {
  font-size: 0.72rem;
}

.u-typeahead-hint {
  font-size: 0.72rem;
}
</style>
