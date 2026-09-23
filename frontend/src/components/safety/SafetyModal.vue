<template>
  <UModal
    :is-open="isOpen"
    max-width="md"
    @close="close"
  >
    <template #header>
      <div class="d-flex align-items-center gap-2 text-danger">
        <i class="ri-shield-alert-fill safety-icon"></i>
        <h3 class="fw-bold fs-6 mb-0 font-display u-text-primary">
          {{ mode === 'report' ? 'Report Profile' : 'Block Connection' }}
        </h3>
      </div>
    </template>

    <div class="d-flex flex-column gap-3">
      <!-- Mode selector -->
      <div class="safety-mode-pills d-flex p-1 rounded-pill">
        <button
          type="button"
          @click="mode = 'report'"
          class="btn flex-fill py-1 px-3 border-0 small fw-bold rounded-pill transition-all"
          :class="mode === 'report' ? 'btn-danger shadow-sm' : 'u-text-secondary'"
        >
          Report User
        </button>
        <button
          type="button"
          @click="mode = 'block'"
          class="btn flex-fill py-1 px-3 border-0 small fw-bold rounded-pill transition-all"
          :class="mode === 'block' ? 'btn-warning text-dark shadow-sm' : 'u-text-secondary'"
        >
          Block User
        </button>
      </div>

      <!-- Report Form -->
      <div v-if="mode === 'report'" class="d-flex flex-column gap-3">
        <div>
          <label class="form-label small fw-semibold mb-1 u-text-secondary">Reason for Report</label>
          <select
            v-model="reportCategory"
            class="form-select form-control-themed w-100"
          >
            <option disabled value="">Select a category</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div>
          <label class="form-label small fw-semibold mb-1 u-text-secondary">Details (Optional)</label>
          <textarea
            v-model="reportDetails"
            rows="3"
            placeholder="Tell us what happened so our moderation team can investigate..."
            class="form-control form-control-themed w-100"
          ></textarea>
        </div>

        <div class="form-check d-flex align-items-center gap-2 mb-0">
          <input
            id="alsoBlock"
            type="checkbox"
            v-model="alsoBlockOnReport"
            class="form-check-input mt-0"
          />
          <label for="alsoBlock" class="form-check-label small user-select-none u-text-secondary">
            Also block this user immediately
          </label>
        </div>
      </div>

      <!-- Block Form -->
      <div v-else class="d-flex flex-column gap-2">
        <p class="small p-3 rounded-3 surface-raised border mb-0 u-text-secondary u-border-glass">
          Blocking <strong class="fw-bold u-text-primary">{{ targetName }}</strong> will immediately hide them from your discovery feed and stop them from messaging you. They will not be notified that you blocked them.
        </p>
        <div>
          <label class="form-label small fw-semibold mb-1 u-text-secondary">Reason (Optional)</label>
          <input
            v-model="blockReason"
            type="text"
            placeholder="e.g. Incompatible conversation, spam, etc."
            class="form-control form-control-themed w-100"
          />
        </div>
      </div>

      <!-- Feedback / Error -->
      <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
        {{ error }}
      </div>
    </div>

    <template #footer>
      <UButton
        variant="ghost"
        size="md"
        @click="close"
      >
        Cancel
      </UButton>
      <UButton
        :variant="mode === 'report' ? 'danger' : 'secondary'"
        size="md"
        :loading="submitting"
        :disabled="submitting || (mode === 'report' && !reportCategory)"
        @click="submitAction"
      >
        {{ mode === 'report' ? 'Submit Report' : 'Confirm Block' }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UModal from '../ui/UModal.vue';
import UButton from '../ui/UButton.vue';
import { useDiscoverStore } from '../../stores/discover';

const props = defineProps<{
  isOpen: boolean;
  targetUserId: string;
  targetName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'actionCompleted'): void;
}>();

const discoverStore = useDiscoverStore();

const mode = ref<'report' | 'block'>('report');
const reportCategory = ref('');
const reportDetails = ref('');
const alsoBlockOnReport = ref(true);
const blockReason = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);

const categories = [
  'Harassment',
  'Spam',
  'Fake profile',
  'Impersonation',
  'Sexual content',
  'Threats',
  'Scam/fraud',
  'Hate/abuse',
  'Illegal activity',
  'Other',
];

function close() {
  error.value = null;
  reportCategory.value = '';
  reportDetails.value = '';
  blockReason.value = '';
  emit('close');
}

async function submitAction() {
  submitting.value = true;
  error.value = null;
  try {
    if (mode.value === 'report') {
      await discoverStore.reportUser(props.targetUserId, reportCategory.value, reportDetails.value);
      if (alsoBlockOnReport.value) {
        await discoverStore.blockUser(props.targetUserId, 'Reported: ' + reportCategory.value);
      }
    } else {
      await discoverStore.blockUser(props.targetUserId, blockReason.value);
    }
    emit('actionCompleted');
    close();
  } catch (err: any) {
    error.value = err.message || 'Action failed. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.safety-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.safety-mode-pills {
  background-color: var(--unmute-surface-overlay, #eef2f9);
  border: 1px solid var(--unmute-glass-border, rgba(15, 23, 42, 0.08));
}

.form-control-themed {
  background-color: var(--unmute-input-bg, #ffffff);
  border: 1px solid var(--unmute-input-border, #cbd5e1);
  color: var(--unmute-text-primary, #0f172a);
  border-radius: var(--unmute-radius-md, 14px);
  padding: 0.65rem 1rem;
  font-size: 0.875rem;

  &:focus {
    background-color: var(--unmute-input-bg, #ffffff);
    border-color: var(--unmute-primary, #8b5cf6);
    box-shadow: 0 0 0 3px var(--unmute-primary-surface);
    color: var(--unmute-text-primary, #0f172a);
  }

  &::placeholder {
    color: var(--unmute-text-dim, #94a3b8);
  }
}
</style>
