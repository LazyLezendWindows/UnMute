<template>
  <UModal
    :is-open="isOpen"
    max-width="md"
    @close="close"
  >
    <template #header>
      <div class="d-flex align-items-center gap-2 text-danger">
        <ShieldAlert class="safety-icon" />
        <h3 class="fw-bold fs-6 text-white mb-0 font-display">
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
          :class="mode === 'report' ? 'btn-danger shadow-sm' : 'text-white-50'"
        >
          Report User
        </button>
        <button
          type="button"
          @click="mode = 'block'"
          class="btn flex-fill py-1 px-3 border-0 small fw-bold rounded-pill transition-all"
          :class="mode === 'block' ? 'btn-warning text-dark shadow-sm' : 'text-white-50'"
        >
          Block User
        </button>
      </div>

      <!-- Report Form -->
      <div v-if="mode === 'report'" class="d-flex flex-column gap-3">
        <div>
          <label class="form-label small fw-semibold text-white-50 mb-1">Reason for Report</label>
          <select
            v-model="reportCategory"
            class="form-select form-control-dark-custom w-100"
          >
            <option disabled value="">Select a category</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div>
          <label class="form-label small fw-semibold text-white-50 mb-1">Details (Optional)</label>
          <textarea
            v-model="reportDetails"
            rows="3"
            placeholder="Tell us what happened so our moderation team can investigate..."
            class="form-control form-control-dark-custom w-100"
          ></textarea>
        </div>

        <div class="form-check d-flex align-items-center gap-2 mb-0">
          <input
            id="alsoBlock"
            type="checkbox"
            v-model="alsoBlockOnReport"
            class="form-check-input mt-0"
          />
          <label for="alsoBlock" class="form-check-label small text-white-50 user-select-none">
            Also block this user immediately
          </label>
        </div>
      </div>

      <!-- Block Form -->
      <div v-else class="d-flex flex-column gap-2">
        <p class="small text-white-50 p-3 rounded-3 surface-raised border mb-0" style="border-color: var(--unmute-border) !important;">
          Blocking <strong class="text-white fw-bold">{{ targetName }}</strong> will immediately hide them from your discovery feed and stop them from messaging you. They will not be notified that you blocked them.
        </p>
        <div>
          <label class="form-label small fw-semibold text-white-50 mb-1">Reason (Optional)</label>
          <input
            v-model="blockReason"
            type="text"
            placeholder="e.g. Incompatible conversation, spam, etc."
            class="form-control form-control-dark-custom w-100"
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
import { ShieldAlert } from 'lucide-vue-next';
import UModal from './ui/UModal.vue';
import UButton from './ui/UButton.vue';
import { useDiscoverStore } from '../stores/discover';

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
  width: 1.25rem;
  height: 1.25rem;
}

.safety-mode-pills {
  background-color: var(--unmute-surface-raised, #161e31);
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.08));
}

.form-control-dark-custom {
  background-color: var(--unmute-surface-raised, #161e31);
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.12));
  color: #ffffff;
  border-radius: var(--radius-md, 14px);
  padding: 0.65rem 1rem;
  font-size: 0.875rem;

  &:focus {
    background-color: var(--unmute-surface-raised, #161e31);
    border-color: var(--theme-primary, #6366f1);
    box-shadow: 0 0 0 3px var(--theme-glow, rgba(99, 102, 241, 0.25));
    color: #ffffff;
  }

  &::placeholder {
    color: var(--unmute-text-muted, #64748b);
  }
}
</style>
