<template>
  <UModal
    :is-open="isOpen"
    max-width="md"
    @close="close"
  >
    <template #header>
      <div class="flex items-center gap-2 text-rose-400">
        <ShieldAlert class="w-5 h-5" />
        <h3 class="font-bold text-base text-white">
          {{ mode === 'report' ? 'Report Profile' : 'Block Connection' }}
        </h3>
      </div>
    </template>

    <div class="space-y-5">
      <!-- Mode selector -->
      <div class="flex p-1 bg-slate-850 rounded-2xl border border-slate-750">
        <button
          type="button"
          @click="mode = 'report'"
          class="flex-1 py-2 text-xs font-semibold rounded-xl transition-all"
          :class="mode === 'report' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'"
        >
          Report User
        </button>
        <button
          type="button"
          @click="mode = 'block'"
          class="flex-1 py-2 text-xs font-semibold rounded-xl transition-all"
          :class="mode === 'block' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'"
        >
          Block User
        </button>
      </div>

      <!-- Report Form -->
      <div v-if="mode === 'report'" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Reason for Report</label>
          <select
            v-model="reportCategory"
            class="w-full bg-slate-850 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option disabled value="">Select a category</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Details (Optional)</label>
          <textarea
            v-model="reportDetails"
            rows="3"
            placeholder="Tell us what happened so our moderation team can investigate..."
            class="w-full bg-slate-850 border border-slate-700/80 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
          ></textarea>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="alsoBlock"
            type="checkbox"
            v-model="alsoBlockOnReport"
            class="rounded-lg bg-slate-800 border-slate-750 text-rose-500 focus:ring-rose-500 w-4 h-4"
          />
          <label for="alsoBlock" class="text-xs text-slate-300 select-none">
            Also block this user immediately
          </label>
        </div>
      </div>

      <!-- Block Form -->
      <div v-else class="space-y-3">
        <p class="text-xs text-slate-300 leading-relaxed bg-slate-850 p-3.5 rounded-2xl border border-slate-800">
          Blocking <strong class="text-white font-semibold">{{ targetName }}</strong> will immediately hide them from your discovery feed and stop them from messaging you. They will not be notified that you blocked them.
        </p>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Reason (Optional)</label>
          <input
            v-model="blockReason"
            type="text"
            placeholder="e.g. Incompatible conversation, spam, etc."
            class="w-full bg-slate-850 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <!-- Feedback / Error -->
      <p v-if="error" class="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
        {{ error }}
      </p>
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
