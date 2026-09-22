<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-xs text-slate-400 font-semibold">
        Select up to 10 interests ({{ modelValue.length }}/10 selected)
      </span>
    </div>

    <!-- Interactive chip grid with tactile press depth -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="interest in allInterests"
        :key="interest.id"
        type="button"
        @click="toggleInterest(interest.id)"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all select-none active:scale-95"
        :class="
          isSelected(interest.id)
            ? 'bg-gradient-to-r from-brand-600 via-purple-600 to-pink-600 text-white shadow-md shadow-brand-500/30 border border-white/20 -translate-y-0.5'
            : 'bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750'
        "
      >
        <span>{{ interest.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { Interest } from '../types';

const props = defineProps<{
  modelValue: string[]; // array of interest IDs
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const allInterests = ref<Interest[]>([]);

onMounted(async () => {
  try {
    const res = await api.get('/users/interests');
    allInterests.value = res.data.data;
  } catch (err) {
    console.error('Failed to load interests:', err);
  }
});

function isSelected(id: string): boolean {
  return props.modelValue.includes(id);
}

function toggleInterest(id: string) {
  if (isSelected(id)) {
    emit(
      'update:modelValue',
      props.modelValue.filter((i) => i !== id)
    );
  } else {
    if (props.modelValue.length < 10) {
      emit('update:modelValue', [...props.modelValue, id]);
    }
  }
}
</script>
