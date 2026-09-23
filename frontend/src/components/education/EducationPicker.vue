<template>
  <form class="d-flex flex-column gap-3" @submit.prevent="save">
    <UTypeahead
      v-model="institution"
      :fetch-items="(q: string) => searchInstitutions(q)"
      :item-key="(i: Institution) => i.id"
      :item-label="(i: Institution) => i.shortName || i.name"
      :item-meta="institutionMeta"
      label="College or university"
      placeholder="e.g. IIT Hyderabad, Osmania, Loyola College"
      icon="ri-graduation-cap-line"
      hint="Shown on your profile, and used by the 'same college' filter."
      :disabled="busy"
    />

    <template v-if="institution">
      <UInput v-model="course" label="Course (optional)" placeholder="e.g. B.Tech Computer Science" :maxlength="100" :disabled="busy" />
      <div class="row g-3">
        <div class="col-6">
          <UInput v-model="startYear" label="Start year" type="number" :min="1950" :max="thisYear" placeholder="2022" :disabled="busy" />
        </div>
        <div class="col-6">
          <UInput v-model="endYear" label="End year" type="number" :min="1950" :max="thisYear + 8" placeholder="2026" :disabled="busy" />
        </div>
      </div>
    </template>

    <p v-if="error" class="small text-danger fw-medium mb-0" role="alert">{{ error }}</p>

    <div class="d-flex justify-content-end gap-2">
      <UButton v-if="saved" variant="ghost" size="md" :disabled="busy" @click="remove">Remove</UButton>
      <UButton type="submit" variant="secondary" size="md" :loading="busy" :disabled="!institution || !dirty">
        Save education
      </UButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UButton from '../ui/UButton.vue';
import UInput from '../ui/UInput.vue';
import UTypeahead from '../ui/UTypeahead.vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { institutionMeta, searchInstitutions } from '../../services/directory';
import { Institution, OwnEducation } from '../../types';

const authStore = useAuthStore();
const toast = useToastStore();
const thisYear = new Date().getFullYear();

const saved = computed(() => authStore.profile?.education ?? null);
const institution = ref<Institution | null>(null);
const course = ref('');
// UInput emits strings, including for type="number".
const startYear = ref('');
const endYear = ref('');
const busy = ref(false);
const error = ref<string | null>(null);

/** The saved education as a picker value; only the names are known, which is all the chip shows. */
function asInstitution(edu: OwnEducation): Institution {
  return {
    id: edu.institutionId,
    name: edu.institutionName,
    shortName: edu.institutionShortName,
    kind: 'university',
    city: '',
    districtName: null,
    stateName: null,
    aisheCode: null,
  };
}

function reset(edu: OwnEducation | null) {
  institution.value = edu ? asInstitution(edu) : null;
  course.value = edu?.course ?? '';
  startYear.value = edu?.startYear ? String(edu.startYear) : '';
  endYear.value = edu?.endYear ? String(edu.endYear) : '';
  error.value = null;
}

watch(saved, reset, { immediate: true });

const toYear = (value: string) => (value.trim() ? Number(value) : null);

const dirty = computed(() => {
  const edu = saved.value;
  return (
    institution.value?.id !== edu?.institutionId ||
    course.value.trim() !== (edu?.course ?? '') ||
    toYear(startYear.value) !== (edu?.startYear ?? null) ||
    toYear(endYear.value) !== (edu?.endYear ?? null)
  );
});

async function save() {
  if (!institution.value) return;
  const start = toYear(startYear.value);
  const end = toYear(endYear.value);
  if ((start !== null && !Number.isInteger(start)) || (end !== null && !Number.isInteger(end))) {
    error.value = 'Years must be whole numbers, like 2022.';
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    await authStore.setEducation({
      institutionId: institution.value.id,
      course: course.value.trim(),
      startYear: start,
      endYear: end,
    });
    toast.success('Education saved.');
  } catch (err: any) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function remove() {
  busy.value = true;
  try {
    await authStore.clearEducation();
    toast.success('Education removed.');
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    busy.value = false;
  }
}
</script>
